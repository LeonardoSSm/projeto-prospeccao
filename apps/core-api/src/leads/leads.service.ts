import { HttpStatus, Injectable } from "@nestjs/common";
import type { Lead, Prisma } from "@prisma/client";
import { IdService } from "../common/id.service";
import { NormalizationService } from "../common/normalization.service";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import { DedupeService, type MatchKind } from "./dedupe.service";

export interface UpsertLeadInput {
  organizationId: string;
  provider: string;
  externalId: string;
  campaignRunId?: string;
  legalName: string;
  tradeName?: string;
  category: string;
  categoriesRaw: string[];
  addressLine?: string;
  city: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  websiteUrl?: string;
  rating?: number;
  reviewCount?: number;
  rawPayload: Record<string, unknown>;
}

export interface UpsertLeadResult {
  leadId: string;
  matchKind: MatchKind;
}

export interface ListLeadsQuery {
  city?: string;
  category?: string;
  websiteStatus?: string[];
  crmStage?: string[];
  sort?: string;
  limit: number;
  cursor?: string;
}

const SORTABLE_FIELDS = new Set(["currentScore", "updatedAt", "tradeName", "rating", "reviewCount"]);

function parseSort(sort: string | undefined): Prisma.LeadOrderByWithRelationInput[] {
  if (!sort) return [{ updatedAt: "desc" }, { id: "desc" }];

  const orderBy = sort
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Prisma.LeadOrderByWithRelationInput | null => {
      const desc = raw.startsWith("-");
      const field = desc ? raw.slice(1) : raw;
      if (!SORTABLE_FIELDS.has(field)) return null;
      return { [field]: desc ? "desc" : "asc" };
    })
    .filter((entry): entry is Prisma.LeadOrderByWithRelationInput => entry !== null);

  return orderBy.length ? [...orderBy, { id: "desc" }] : [{ updatedAt: "desc" }, { id: "desc" }];
}

export interface ListLeadsResult {
  items: Lead[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly normalization: NormalizationService,
    private readonly dedupe: DedupeService,
  ) {}

  // Ponto único de entrada de dados externos (conector de descoberta ou CSV): normaliza,
  // decide MATCH/NEW (docs/DOCUMENTATION.md seção 3.4) e persiste tudo em uma transação.
  async upsertFromSource(input: UpsertLeadInput): Promise<UpsertLeadResult> {
    const normalizedDomain = this.normalization.domain(input.websiteUrl);
    const normalizedPhone = this.normalization.phone(input.phone);
    const cityNormalized = this.normalization.city(input.city);

    return this.prisma.$transaction(async (tx) => {
      const match = await this.dedupe.findMatch(tx, {
        organizationId: input.organizationId,
        provider: input.provider,
        externalId: input.externalId,
        normalizedDomain,
        normalizedPhone,
      });

      const leadId =
        match.kind === "MATCH" && match.leadId
          ? match.leadId
          : (
              await tx.lead.create({
                data: {
                  id: this.idService.generate(),
                  organizationId: input.organizationId,
                  legalName: input.legalName,
                  tradeName: input.tradeName,
                  category: input.category,
                  categoriesRaw: input.categoriesRaw,
                  addressLine: input.addressLine,
                  city: input.city,
                  cityNormalized,
                  state: input.state,
                  country: input.country,
                  latitude: input.latitude,
                  longitude: input.longitude,
                  // Sem uma URL canônica separada da versão normalizada por ora;
                  // os dois campos convergem até existir um caso de uso que precise
                  // preservar a grafia original do domínio.
                  domain: normalizedDomain,
                  normalizedDomain,
                  websiteUrl: input.websiteUrl,
                  websiteStatus: input.websiteUrl
                    ? "HAS_WEBSITE"
                    : input.instagram
                      ? "SOCIAL_ONLY"
                      : "NO_WEBSITE",
                  rating: input.rating,
                  reviewCount: input.reviewCount,
                },
              })
            ).id;

      if (input.phone && normalizedPhone) {
        await this.upsertContact(tx, leadId, "PHONE", input.phone, normalizedPhone);
      }
      if (input.whatsapp) {
        const normalizedWhatsapp = this.normalization.phone(input.whatsapp);
        if (normalizedWhatsapp) {
          await this.upsertContact(tx, leadId, "WHATSAPP", input.whatsapp, normalizedWhatsapp);
        }
      }
      if (input.instagram) {
        await this.upsertContact(tx, leadId, "INSTAGRAM", input.instagram, input.instagram.toLowerCase());
      }

      await tx.leadSource.upsert({
        where: {
          organizationId_provider_externalId: {
            organizationId: input.organizationId,
            provider: input.provider,
            externalId: input.externalId,
          },
        },
        create: {
          id: this.idService.generate(),
          organizationId: input.organizationId,
          leadId,
          campaignRunId: input.campaignRunId,
          provider: input.provider,
          externalId: input.externalId,
          rawPayload: input.rawPayload as Prisma.InputJsonValue,
        },
        update: {
          lastSeenAt: new Date(),
          rawPayload: input.rawPayload as Prisma.InputJsonValue,
        },
      });

      return { leadId, matchKind: match.kind };
    });
  }

  private async upsertContact(
    tx: Prisma.TransactionClient,
    leadId: string,
    type: string,
    value: string,
    normalizedValue: string,
  ): Promise<void> {
    const existing = await tx.leadContact.findFirst({
      where: { leadId, type, normalizedValue, deletedAt: null },
    });
    if (existing) return;

    await tx.leadContact.create({
      data: {
        id: this.idService.generate(),
        leadId,
        type,
        value,
        normalizedValue,
        primaryContact: type === "PHONE",
      },
    });
  }

  async findMany(organizationId: string, query: ListLeadsQuery): Promise<ListLeadsResult> {
    const offset = decodeCursor(query.cursor);

    const where: Prisma.LeadWhereInput = {
      organizationId,
      mergedIntoId: null,
      ...(query.city ? { cityNormalized: this.normalization.city(query.city) } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.websiteStatus?.length ? { websiteStatus: { in: query.websiteStatus } } : {}),
      ...(query.crmStage?.length ? { crmStage: { in: query.crmStage } } : {}),
    };

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: parseSort(query.sort),
      skip: offset,
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      items,
      hasMore,
      nextCursor: hasMore ? encodeCursor(offset + query.limit) : null,
    };
  }

  async findOne(organizationId: string, id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: { contacts: true },
    });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Lead não encontrado",
        errorCode: "LEAD_NOT_FOUND",
      });
    }
    return lead;
  }
}

// Cursor opaco simples (offset codificado em base64). Suficiente para o volume do
// MVP; keyset real por (score, id) entra quando o score existir (Fase 3) e a
// ordenação padrão deixar de ser só por updatedAt.
function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.offset === "number" && parsed.offset >= 0 ? parsed.offset : 0;
  } catch {
    return 0;
  }
}
