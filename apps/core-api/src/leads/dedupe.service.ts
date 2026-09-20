import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export type MatchKind = "MATCH" | "NEW";

export interface MatchResult {
  kind: MatchKind;
  leadId?: string;
}

interface MatchInput {
  organizationId: string;
  provider: string;
  externalId: string;
  cnpj: string | null;
  normalizedDomain: string | null;
  normalizedPhone: string | null;
}

// Deduplicação (docs/DOCUMENTATION.md seção 3.4): apenas os 3 sinais fortes por
// enquanto — ID do provedor, domínio e telefone normalizados. Identificador fiscal e
// o par nome+endereço (sinal fraco, que produziria POSSIBLE_MATCH) ficam para uma
// iteração futura, junto da tela de revisão de pendências.
@Injectable()
export class DedupeService {
  async findMatch(tx: Prisma.TransactionClient, input: MatchInput): Promise<MatchResult> {
    const bySource = await tx.leadSource.findUnique({
      where: {
        organizationId_provider_externalId: {
          organizationId: input.organizationId,
          provider: input.provider,
          externalId: input.externalId,
        },
      },
    });
    if (bySource) {
      return { kind: "MATCH", leadId: bySource.leadId };
    }

    // CNPJ é o sinal mais forte que existe — mais confiável até que domínio ou
    // telefone, que podem ser compartilhados entre filiais ou trocados.
    if (input.cnpj) {
      const byCnpj = await tx.lead.findFirst({
        where: { organizationId: input.organizationId, cnpj: input.cnpj, mergedIntoId: null },
      });
      if (byCnpj) {
        return { kind: "MATCH", leadId: byCnpj.id };
      }
    }

    if (input.normalizedDomain) {
      const byDomain = await tx.lead.findFirst({
        where: {
          organizationId: input.organizationId,
          normalizedDomain: input.normalizedDomain,
          mergedIntoId: null,
        },
      });
      if (byDomain) {
        return { kind: "MATCH", leadId: byDomain.id };
      }
    }

    if (input.normalizedPhone) {
      const byPhone = await tx.leadContact.findFirst({
        where: {
          type: "PHONE",
          normalizedValue: input.normalizedPhone,
          deletedAt: null,
          lead: { organizationId: input.organizationId, mergedIntoId: null },
        },
      });
      if (byPhone) {
        return { kind: "MATCH", leadId: byPhone.leadId };
      }
    }

    return { kind: "NEW" };
  }
}
