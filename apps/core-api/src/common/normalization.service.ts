import { Injectable } from "@nestjs/common";

// Regras de normalização (docs/DOCUMENTATION.md seção 3.1): domínio, telefone e
// nome/cidade têm versões normalizadas para busca e deduplicação.
@Injectable()
export class NormalizationService {
  domain(urlOrDomain: string | null | undefined): string | null {
    if (!urlOrDomain) return null;
    const trimmed = urlOrDomain.trim();
    if (!trimmed) return null;

    try {
      const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const host = new URL(withScheme).hostname.toLowerCase();
      return host.startsWith("www.") ? host.slice(4) : host;
    } catch {
      return null;
    }
  }

  // Normalização simplificada para números brasileiros: mantém apenas dígitos e
  // prefixa o código do país quando ausente. Não substitui uma lib como
  // libphonenumber para validação completa — suficiente para dedupe no MVP.
  phone(raw: string | null | undefined, defaultCountryCode = "55"): string | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;

    if (digits.startsWith(defaultCountryCode) && digits.length >= 12) {
      return `+${digits}`;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `+${defaultCountryCode}${digits}`;
    }
    return `+${digits}`;
  }

  city(raw: string | null | undefined): string {
    return (raw ?? "").trim().toLowerCase();
  }

  name(raw: string | null | undefined): string {
    return (raw ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }
}
