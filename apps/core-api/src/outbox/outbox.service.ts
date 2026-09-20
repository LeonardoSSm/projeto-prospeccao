import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { IdService } from "../common/id.service";

interface RecordEventParams {
  organizationId: string;
  eventType: string;
  correlationId: string;
  causationId?: string;
  payload: Record<string, unknown>;
}

// Outbox transacional (ADR-005, docs/DOCUMENTATION.md seção 2.1/3.3): grava o evento
// na MESMA transação da mudança de domínio. Quem chama passa o `tx` do
// `prisma.$transaction(...)` em andamento — nunca `this.prisma` diretamente,
// senão o evento pode ficar gravado sem a mudança que o originou (ou vice-versa).
@Injectable()
export class OutboxService {
  constructor(private readonly idService: IdService) {}

  async record(tx: Prisma.TransactionClient, params: RecordEventParams): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        id: this.idService.generate(),
        organizationId: params.organizationId,
        eventType: params.eventType,
        correlationId: params.correlationId,
        causationId: params.causationId,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  }
}
