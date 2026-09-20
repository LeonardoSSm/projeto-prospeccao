import * as dns from "node:dns/promises";
import type { Route } from "playwright";
import { isBlockedIp } from "./ip-classifier";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "data:", "blob:"]);

async function isHostnameBlocked(hostname: string): Promise<boolean> {
  try {
    const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
    const addresses = [
      ...(v4.status === "fulfilled" ? v4.value : []),
      ...(v6.status === "fulfilled" ? v6.value : []),
    ];
    if (addresses.length === 0) return true;
    return addresses.some(isBlockedIp);
  } catch {
    return true;
  }
}

// Bloqueia sub-recursos da página (imagens, scripts, XHR/fetch) que apontem para
// IP privado/loopback/link-local — mesma política do preflight (safe-fetch.ts),
// aplicada a QUALQUER host que a página referencie, não só o alvo da navegação.
//
// Limitação aceita conscientemente: como o Chromium resolve o DNS de novo por
// conta própria ao efetivamente conectar, existe uma janela de TOCTOU para
// rebinding aqui (diferente da navegação principal, que é pinada via
// --host-resolver-rules em audit-runner.ts). Para o alvo principal da auditoria
// isso não se aplica; para sub-recursos de terceiros, o risco residual é
// aceitável frente ao custo de travar host-resolver-rules dinamicamente por
// requisição — documentado aqui para revisão futura.
export function createSsrfRouteGuard() {
  const cache = new Map<string, boolean>();

  return async (route: Route): Promise<void> => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      await route.abort("blockedbyclient");
      return;
    }

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      await route.abort("blockedbyclient");
      return;
    }
    if (url.protocol === "data:" || url.protocol === "blob:") {
      await route.continue();
      return;
    }

    let blocked = cache.get(url.hostname);
    if (blocked === undefined) {
      blocked = await isHostnameBlocked(url.hostname);
      cache.set(url.hostname, blocked);
    }

    if (blocked) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  };
}
