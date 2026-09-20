import { HttpStatus, Injectable } from "@nestjs/common";
import type { CrmActivity, Lead, Prisma } from "@prisma/client";
import { AuditLogService } from "../common/audit-log.service";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateCrmDto } from "./dto/update-crm.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly auditLog: AuditLogService,
    private readonly outbox: OutboxService,
  ) {}

  // UC-11 (Atualizar funil): "toda mudança gera atividade e audit_log"
  // (docs/DOCUMENTATION.md seção 3.3) — as três escritas (lead, atividade,
  // audit log) acontecem juntas numa transação, e a checagem de versão é
  // atômica (updateMany com version na cláusula WHERE), mesmo padrão de
  // leads.service.ts#update.
  async updateCrm(
    organizationId: string,
    leadId: string,
    dto: UpdateCrmDto,
    ifMatchVersion: number | undefined,
    correlationId: string,
    actorUserId: string,
  ): Promise<Lead> {
    const current = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!current) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }

    if (dto.assignedUserId) {
      const membership = await this.prisma.membership.findFirst({
        where: { organizationId, userId: dto.assignedUserId, status: "ACTIVE" },
      });
      if (!membership) {
        throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
          title: "Usuário responsável inválido",
          detail: "O usuário informado não é membro ativo desta organização.",
          errorCode: "ASSIGNED_USER_NOT_FOUND",
        });
      }
    }

    const data: Prisma.LeadUpdateInput = {
      ...(dto.stage !== undefined ? { crmStage: dto.stage } : {}),
      ...(dto.assignedUserId !== undefined ? { assignedUserId: dto.assignedUserId } : {}),
      ...(dto.nextActionAt !== undefined ? { nextActionAt: new Date(dto.nextActionAt) } : {}),
      version: { increment: 1 },
    };

    await this.prisma.$transaction(async (tx) => {
      if (ifMatchVersion !== undefined) {
        const result = await tx.lead.updateMany({
          where: { id: leadId, organizationId, version: ifMatchVersion },
          data,
        });
        if (result.count === 0) {
          throw new AppException(HttpStatus.PRECONDITION_FAILED, {
            title: "Versão desatualizada",
            detail: "O lead foi modificado por outra operação. Releia o recurso e tente novamente.",
            errorCode: "LEAD_VERSION_MISMATCH",
          });
        }
      } else {
        await tx.lead.update({ where: { id: leadId }, data });
      }

      await tx.crmActivity.create({
        data: {
          id: this.idService.generate(),
          leadId,
          activityType: dto.stage !== undefined ? "STAGE_CHANGE" : "CRM_UPDATE",
          summary: dto.note ?? this.describeChange(current, dto),
          nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
        },
      });

      await this.auditLog.record(
        {
          organizationId,
          actorUserId,
          action: "LEAD_CRM_UPDATED",
          resourceType: "LEAD",
          resourceId: leadId,
          changes: { from: { stage: current.crmStage, assignedUserId: current.assignedUserId }, to: dto },
        },
        tx,
      );

      await this.outbox.record(tx, {
        organizationId,
        eventType: "lead.crm.updated",
        correlationId,
        payload: { leadId, stage: dto.stage, assignedUserId: dto.assignedUserId, nextActionAt: dto.nextActionAt },
      });
    });

    return this.prisma.lead.findFirstOrThrow({ where: { id: leadId } });
  }

  async listActivities(organizationId: string, leadId: string): Promise<CrmActivity[]> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }
    return this.prisma.crmActivity.findMany({ where: { leadId }, orderBy: { occurredAt: "desc" } });
  }

  async funnelSummary(organizationId: string): Promise<Array<{ stage: string; count: number }>> {
    const grouped = await this.prisma.lead.groupBy({
      by: ["crmStage"],
      where: { organizationId, mergedIntoId: null },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ stage: g.crmStage, count: g._count._all }));
  }

  private describeChange(current: Lead, dto: UpdateCrmDto): string {
    const parts: string[] = [];
    if (dto.stage !== undefined && dto.stage !== current.crmStage) {
      parts.push(`estágio: ${current.crmStage} → ${dto.stage}`);
    }
    if (dto.assignedUserId !== undefined) {
      parts.push("responsável atualizado");
    }
    if (dto.nextActionAt !== undefined) {
      parts.push(`próxima ação: ${dto.nextActionAt}`);
    }
    return parts.length > 0 ? parts.join("; ") : "Atualização de CRM sem detalhes adicionais";
  }
}
