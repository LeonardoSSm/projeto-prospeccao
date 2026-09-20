import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { IdService } from "./id.service";
import { PrismaService } from "../prisma/prisma.service";

interface RecordAuditLogParams {
  organizationId: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown>;
}

// "quem fez o quê, quando e sobre qual recurso" (docs/DOCUMENTATION.md seção 3.3) —
// append-only por convenção de uso: nada aqui expõe update/delete.
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
  ) {}

  async record(params: RecordAuditLogParams, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        id: this.idService.generate(),
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        changes: params.changes as Prisma.InputJsonValue,
      },
    });
  }
}
