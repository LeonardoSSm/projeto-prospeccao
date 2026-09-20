import { Injectable, Logger } from "@nestjs/common";
import type { DiscoveredPlace, PlacesProvider, PlacesSearchParams } from "./places-provider.interface";

// Gera resultados determinísticos (mesma entrada -> mesma saída) para desenvolvimento
// e testes, sem depender de rede ou de uma chave de API real (docs/DOCUMENTATION.md
// seções 1.6 e 6.5 — "servidor mock para descoberta e LLM").
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  let state = h >>> 0 || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

const NAME_SUFFIXES = ["Center", "Premium", "Express", "& Associados", "Digital", "Plus", "Studio"];

@Injectable()
export class MockPlacesProvider implements PlacesProvider {
  readonly name = "MOCK";
  private readonly logger = new Logger(MockPlacesProvider.name);

  async search(params: PlacesSearchParams): Promise<DiscoveredPlace[]> {
    const rand = seededRandom(`${params.category}:${params.city}`.toLowerCase());
    const count = Math.min(params.maxResults, 100);
    const results: DiscoveredPlace[] = [];

    for (let i = 1; i <= count; i++) {
      const suffix = NAME_SUFFIXES[Math.floor(rand() * NAME_SUFFIXES.length)];
      const legalName = `${capitalize(params.category)} ${suffix} ${i} Ltda`;
      const tradeName = `${capitalize(params.category)} ${suffix} ${i}`;
      const hasWebsite = rand() > 0.45;
      const hasInstagramOnly = !hasWebsite && rand() > 0.5;
      const slug = slugify(`${tradeName}-${params.city}`);

      results.push({
        externalId: `mock-${slugify(params.category)}-${slugify(params.city)}-${i}`,
        legalName,
        tradeName,
        category: params.category,
        categoriesRaw: [params.category],
        addressLine: `Rua ${capitalize(params.category)}, ${100 + i}`,
        city: params.city,
        country: "BR",
        latitude: -23.55 + rand() * 0.2,
        longitude: -46.63 + rand() * 0.2,
        phone: `11${9000_0000 + Math.floor(rand() * 999_9999)}`,
        whatsapp: rand() > 0.3 ? `11${9000_0000 + Math.floor(rand() * 999_9999)}` : undefined,
        instagram: hasInstagramOnly ? `@${slug}` : undefined,
        websiteUrl: hasWebsite ? `https://www.${slug}.com.br` : undefined,
        rating: Math.round((3 + rand() * 2) * 10) / 10,
        reviewCount: Math.floor(rand() * 400),
        raw: { source: "mock-places", generatedAt: new Date().toISOString() },
      });
    }

    this.logger.debug(`Mock: ${results.length} resultados para ${params.category}/${params.city}`);
    return results;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
