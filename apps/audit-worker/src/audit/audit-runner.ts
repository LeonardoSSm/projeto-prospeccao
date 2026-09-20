import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { config } from "../config";
import { safeFetch } from "../ssrf/safe-fetch";
import { createSsrfRouteGuard } from "../ssrf/request-guard";
import { uploadArtifact } from "../storage/s3-client";
import { extractInstagramHandle, extractWhatsAppNumber } from "./contact-extraction";
import { buildFindings } from "./findings";
import type { AuditCompletedPayload, AuditRequestedPayload } from "./types";

const ENGINE_VERSION = "playwright+lighthouse";
const CDP_PORT = 9222;

// Formato mínimo do LHR (Lighthouse Result) que realmente consumimos — a lib não
// publica um tipo estável entre versões major, então modelamos só o que usamos.
interface LighthouseAudit {
  score?: number | null;
  numericValue?: number;
  details?: { items?: unknown[] };
}
interface LighthouseResult {
  categories: Record<string, { score: number | null }>;
  audits: Record<string, LighthouseAudit>;
}

function scoreOf(lhr: LighthouseResult, category: string): number | null {
  const score = lhr.categories[category]?.score;
  return score == null ? null : Math.round(score * 100);
}

function numericOf(lhr: LighthouseResult, audit: string): number | null {
  const value = lhr.audits[audit]?.numericValue;
  return value == null ? null : Math.round(value);
}

async function runLighthouse(url: string, profile: "MOBILE" | "DESKTOP"): Promise<LighthouseResult> {
  // `lighthouse` é ESM-only; import dinâmico para consumir de um worker CommonJS.
  const { default: lighthouse } = await import("lighthouse");

  const isDesktop = profile === "DESKTOP";
  const result = await lighthouse(
    url,
    { port: CDP_PORT, logLevel: "error" },
    {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
        formFactor: isDesktop ? "desktop" : "mobile",
        throttlingMethod: "simulate",
        screenEmulation: isDesktop
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
          : { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625, disabled: false },
      },
    },
  );

  if (!result?.lhr) {
    throw new Error("Lighthouse não retornou resultado");
  }
  return result.lhr as unknown as LighthouseResult;
}

export async function runAudit(request: AuditRequestedPayload): Promise<AuditCompletedPayload> {
  // 1. Sondagem HTTP com validação de SSRF, hop a hop, ANTES de abrir o navegador.
  const preflight = await safeFetch(request.url, {
    maxRedirects: config.maxRedirects,
    timeoutMs: config.timeoutMs,
    maxBytes: config.maxResponseBytes,
  });

  // 2. Pina no Chromium os hosts já validados — a navegação real não deve
  // re-resolver DNS para o alvo principal (janela de rebinding fechada).
  const resolverRules = Object.entries(preflight.hostIpMap)
    .map(([host, ip]) => `MAP ${host} ${ip}`)
    .join(",");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
      "--disable-background-networking",
      `--remote-debugging-port=${CDP_PORT}`,
      ...(resolverRules ? [`--host-resolver-rules=${resolverRules}`] : []),
    ],
  });

  try {
    const isDesktop = request.profile === "DESKTOP";
    const context = await browser.newContext({
      viewport: isDesktop ? { width: 1350, height: 940 } : { width: 412, height: 823 },
      userAgent: isDesktop
        ? undefined
        : "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari/537.36",
    });
    const page = await context.newPage();
    // Sub-recursos (imagens, scripts, XHR de terceiros) passam pelo guard de SSRF;
    // ver limitação documentada em request-guard.ts.
    await page.route("**/*", createSsrfRouteGuard());

    await page.goto(preflight.finalUrl, {
      waitUntil: "load",
      timeout: config.timeoutMs,
    });

    const domFeatures = await page.evaluate(() => {
      // page.evaluate() só devolve dados serializáveis — o parsing do valor real
      // (número/handle) do href acontece fora do navegador, em contact-extraction.ts.
      const whatsAppHref = document
        .querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]')
        ?.getAttribute("href") ?? null;
      const instagramHref = document.querySelector('a[href*="instagram.com/"]')?.getAttribute("href") ?? null;
      const hasContactForm = Boolean(document.querySelector("form"));
      const hasTitle = document.title.trim().length > 0;
      const metaDescription = document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim();
      return {
        whatsAppHref,
        instagramHref,
        hasContactForm,
        hasTitle,
        hasMetaDescription: Boolean(metaDescription),
      };
    });

    const screenshotBuffer = await page.screenshot({ type: "png" });
    const contentHash = createHash("sha256").update(screenshotBuffer).digest("hex");

    // 3. Lighthouse audita o MESMO navegador via CDP (mesma origem já carregada).
    const lhr = await runLighthouse(preflight.finalUrl, request.profile);

    await context.close();

    const scores = {
      performance: scoreOf(lhr, "performance"),
      accessibility: scoreOf(lhr, "accessibility"),
      seo: scoreOf(lhr, "seo"),
      bestPractices: scoreOf(lhr, "best-practices"),
    };
    const metrics = {
      lcpMs: numericOf(lhr, "largest-contentful-paint"),
      cls: numericOf(lhr, "cumulative-layout-shift"),
      tbtMs: numericOf(lhr, "total-blocking-time"),
      ttfbMs: numericOf(lhr, "server-response-time"),
      requestCount: lhr.audits["network-requests"]?.details?.items?.length ?? null,
    };
    const mobileFriendly = (lhr.audits["viewport"]?.score ?? 0) === 1;
    const whatsappNumber = extractWhatsAppNumber(domFeatures.whatsAppHref);
    const instagramHandle = extractInstagramHandle(domFeatures.instagramHref);
    const features = {
      mobileFriendly,
      hasWhatsAppCta: Boolean(domFeatures.whatsAppHref),
      hasContactForm: domFeatures.hasContactForm,
      hasTitle: domFeatures.hasTitle,
      hasMetaDescription: domFeatures.hasMetaDescription,
      whatsappNumber,
      instagramHandle,
    };

    const reportKey = `audits/${request.auditRequestId}/lighthouse.json`;
    const screenshotKey = `audits/${request.auditRequestId}/screenshot.png`;
    await uploadArtifact(reportKey, Buffer.from(JSON.stringify(lhr)), "application/json");
    await uploadArtifact(screenshotKey, screenshotBuffer, "image/png");

    const findings = buildFindings({ scores, features, https: preflight.https });

    return {
      auditRequestId: request.auditRequestId,
      leadId: request.leadId,
      engineVersion: ENGINE_VERSION,
      finalUrl: preflight.finalUrl,
      contentHash,
      http: {
        status: preflight.status,
        https: preflight.https,
        redirectCount: preflight.redirectCount,
      },
      lighthouse: { ...scores, metrics },
      features,
      findings,
      reportObjectKey: reportKey,
      screenshotObjectKey: screenshotKey,
    };
  } finally {
    await browser.close();
  }
}
