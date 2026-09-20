import type { LookupAddress, LookupAllOptions, LookupOneOptions } from "node:dns";
import * as dns from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import net from "node:net";
import { isBlockedIp } from "./ip-classifier";

export class SsrfBlockedError extends Error {}

export interface SafeFetchOptions {
  maxRedirects: number;
  timeoutMs: number;
  maxBytes: number;
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  https: boolean;
  redirectCount: number;
  // hostname -> IP validado nesta requisição. Alimenta o
  // --host-resolver-rules do Chromium para que a navegação real (Playwright/
  // Lighthouse) resolva os MESMOS IPs já validados, em vez de re-resolver DNS
  // e abrir uma janela para rebinding.
  hostIpMap: Record<string, string>;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function resolveValidatedIp(hostname: string): Promise<string> {
  // O host já pode ser um literal de IP (comum em tentativas de SSRF, mas também
  // em URLs legítimas) — dns.resolve4/6 rejeita esse caso por não ser um nome a
  // resolver, então validamos direto em vez de tratar isso como falha de DNS.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new SsrfBlockedError(`IP bloqueado: "${hostname}"`);
    }
    return hostname;
  }

  const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
  const addresses = [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : []),
  ];
  if (addresses.length === 0) {
    // Falha de DNS pode ser transitória (propagação, resolvedor instável) — deixa
    // como erro comum para entrar no fluxo normal de retry, diferente de um IP
    // que resolveu e É bloqueado (esse sim, definitivo, ver SsrfBlockedError acima).
    throw new Error(`Não foi possível resolver DNS para "${hostname}"`);
  }
  const blocked = addresses.filter(isBlockedIp);
  if (blocked.length > 0) {
    throw new SsrfBlockedError(`Host "${hostname}" resolve para IP bloqueado (${blocked.join(", ")})`);
  }
  return addresses[0];
}

function probeOnce(
  url: URL,
  ip: string,
  opts: SafeFetchOptions,
): Promise<{ status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const family = net.isIPv6(ip) ? 6 : 4;

    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        timeout: opts.timeoutMs,
        headers: { Host: url.hostname, "User-Agent": "ProspectorAuditBot/1.0" },
        rejectUnauthorized: true,
        lookup: (
          _hostname: string,
          lookupOpts: LookupOneOptions | LookupAllOptions,
          callback: (
            err: NodeJS.ErrnoException | null,
            address: string | LookupAddress[],
            family?: number,
          ) => void,
        ) => {
          if ((lookupOpts as LookupAllOptions).all) {
            callback(null, [{ address: ip, family }]);
          } else {
            callback(null, ip, family);
          }
        },
      },
      (res) => {
        let received = 0;
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > opts.maxBytes) {
            req.destroy(new Error("Resposta excedeu o tamanho máximo permitido"));
          }
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, location: res.headers.location }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error(`Timeout (${opts.timeoutMs}ms) na sondagem HTTP`)));
    req.on("error", reject);
    req.end();
  });
}

// Sondagem HTTP com validação de SSRF a cada hop de redirecionamento
// (docs/DOCUMENTATION.md seção 5.4). Roda ANTES de qualquer navegador tocar a URL.
export async function safeFetch(inputUrl: string, opts: SafeFetchOptions): Promise<SafeFetchResult> {
  const hostIpMap: Record<string, string> = {};
  let currentUrl = new URL(inputUrl);
  let redirectCount = 0;

  for (;;) {
    if (!ALLOWED_PROTOCOLS.has(currentUrl.protocol)) {
      throw new SsrfBlockedError(`Esquema não permitido: "${currentUrl.protocol}"`);
    }

    const ip = hostIpMap[currentUrl.hostname] ?? (await resolveValidatedIp(currentUrl.hostname));
    hostIpMap[currentUrl.hostname] = ip;

    const { status, location } = await probeOnce(currentUrl, ip, opts);

    if (REDIRECT_STATUSES.has(status) && location) {
      redirectCount += 1;
      if (redirectCount > opts.maxRedirects) {
        throw new SsrfBlockedError(`Excedeu o limite de ${opts.maxRedirects} redirecionamentos`);
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return {
      finalUrl: currentUrl.toString(),
      status,
      https: currentUrl.protocol === "https:",
      redirectCount,
      hostIpMap,
    };
  }
}
