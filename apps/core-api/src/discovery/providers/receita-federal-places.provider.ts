import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CNAE_BY_CATEGORY } from "./cnae-by-category";
import type { DiscoveredPlace, PlacesProvider, PlacesSearchParams } from "./places-provider.interface";

// Adaptador real de descoberta: consulta localmente o catálogo de CNPJ já
// importado (ver apps/core-api/scripts/cnpj-import/) em vez de chamar uma API
// externa — os dados já estão no Postgres, então search() é uma query comum,
// não uma chamada de rede (docs/ANALISE_FONTES_DADOS_PROSPECCAO_LOCAL.md).
// `radiusKm` é ignorado por enquanto: o CNPJ traz endereço, não coordenada —
// isso muda na Fase 2 (geocodificação via OpenStreetMap/Nominatim).
@Injectable()
export class ReceitaFederalPlacesProvider implements PlacesProvider {
  readonly name = "RECEITA_FEDERAL";
  private readonly logger = new Logger(ReceitaFederalPlacesProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(params: PlacesSearchParams): Promise<DiscoveredPlace[]> {
    const cnaes = CNAE_BY_CATEGORY[params.category.toUpperCase()];
    if (!cnaes || cnaes.length === 0) {
      this.logger.warn(
        `Categoria "${params.category}" não tem CNAE mapeado para RECEITA_FEDERAL — retornando 0 resultados.`,
      );
      return [];
    }

    const rows = await this.prisma.cnpjEstablishment.findMany({
      where: {
        municipioNome: { equals: params.city, mode: "insensitive" },
        situacaoCadastral: "ATIVA",
        OR: [
          { cnaeFiscalPrincipal: { in: cnaes } },
          { cnaesSecundarios: { hasSome: cnaes } },
        ],
      },
      take: Math.min(params.maxResults, 1000),
      orderBy: { razaoSocial: "asc" },
    });

    this.logger.debug(`Receita Federal: ${rows.length} estabelecimentos para ${params.category}/${params.city}`);

    return rows.map((row) => ({
      externalId: row.cnpj,
      cnpj: row.cnpj,
      legalName: row.razaoSocial,
      tradeName: row.nomeFantasia ?? undefined,
      category: params.category,
      categoriesRaw: [row.cnaeFiscalPrincipal, ...row.cnaesSecundarios],
      addressLine: [row.logradouro, row.numero].filter(Boolean).join(", ") || undefined,
      city: row.municipioNome,
      state: row.uf,
      country: "BR",
      phone: row.ddd1 && row.telefone1 ? `${row.ddd1}${row.telefone1}` : undefined,
      websiteUrl: undefined,
      raw: { source: "cnpj_establishments", id: row.id, capturedFrom: row.importedAt },
    }));
  }
}
