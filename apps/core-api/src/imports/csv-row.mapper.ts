import { createHash } from "node:crypto";

const HEADER_ALIASES: Record<string, string> = {
  legalname: "legalName",
  legal_name: "legalName",
  razaosocial: "legalName",
  razao_social: "legalName",
  tradename: "tradeName",
  trade_name: "tradeName",
  nomefantasia: "tradeName",
  nome_fantasia: "tradeName",
  nome: "tradeName",
  category: "category",
  categoria: "category",
  city: "city",
  cidade: "city",
  state: "state",
  estado: "state",
  uf: "state",
  country: "country",
  pais: "country",
  addressline: "addressLine",
  address: "addressLine",
  endereco: "addressLine",
  phone: "phone",
  telefone: "phone",
  whatsapp: "whatsapp",
  instagram: "instagram",
  website: "websiteUrl",
  site: "websiteUrl",
  url: "websiteUrl",
  rating: "rating",
  avaliacao: "rating",
  reviewcount: "reviewCount",
  review_count: "reviewCount",
  avaliacoes: "reviewCount",
};

export interface CsvLeadRow {
  legalName: string;
  tradeName?: string;
  category: string;
  addressLine?: string;
  city: string;
  state?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  websiteUrl?: string;
  rating?: number;
  reviewCount?: number;
}

export function normalizeHeader(header: string): string {
  const key = header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[key.replace(/_/g, "")] ?? key;
}

export function toLeadRow(record: Record<string, string>): CsvLeadRow | null {
  const legalName = record.legalName?.trim();
  const city = record.city?.trim();
  if (!legalName || !city) return null;

  return {
    legalName,
    tradeName: record.tradeName?.trim() || undefined,
    category: record.category?.trim() || "UNSPECIFIED",
    addressLine: record.addressLine?.trim() || undefined,
    city,
    state: record.state?.trim() || undefined,
    country: record.country?.trim() || undefined,
    phone: record.phone?.trim() || undefined,
    whatsapp: record.whatsapp?.trim() || undefined,
    instagram: record.instagram?.trim() || undefined,
    websiteUrl: record.websiteUrl?.trim() || undefined,
    rating: record.rating ? Number(record.rating) : undefined,
    reviewCount: record.reviewCount ? Number(record.reviewCount) : undefined,
  };
}

// externalId estável por linha (mesmo conteúdo -> mesmo hash), para que reimportar o
// mesmo CSV atualize `last_seen_at` em vez de criar uma nova lead_source a cada vez.
export function csvRowExternalId(row: CsvLeadRow): string {
  const key = `${row.legalName}|${row.city}|${row.phone ?? ""}`.toLowerCase();
  return createHash("sha1").update(key).digest("hex");
}
