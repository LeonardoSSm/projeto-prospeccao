// Extração de contato real a partir dos links já vistos pelo crawler
// (audit-runner.ts detecta a PRESENÇA de um CTA de WhatsApp/Instagram; aqui
// extraímos o VALOR real do href, fora do contexto do navegador — page.evaluate()
// só pode devolver dados serializáveis, então o parsing fica do lado de fora).
const WA_ME_PATTERN = /wa\.me\/(\d+)/i;
const WA_API_PHONE_PATTERN = /[?&]phone=(\d+)/i;
const IG_HANDLE_PATTERN = /instagram\.com\/([A-Za-z0-9_.]+)/i;

// Caminhos do Instagram que não são um perfil (post, reel, etc.) — bater aqui
// não é um handle de contato válido.
const IG_RESERVED_PATHS = new Set([
  "p", "reel", "reels", "explore", "accounts", "stories", "tv", "direct", "developer",
]);

export function extractWhatsAppNumber(href: string | null | undefined): string | null {
  if (!href) return null;
  return WA_ME_PATTERN.exec(href)?.[1] ?? WA_API_PHONE_PATTERN.exec(href)?.[1] ?? null;
}

export function extractInstagramHandle(href: string | null | undefined): string | null {
  if (!href) return null;
  const handle = IG_HANDLE_PATTERN.exec(href)?.[1];
  if (!handle) return null;
  return IG_RESERVED_PATHS.has(handle.toLowerCase()) ? null : handle;
}
