import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import type { OutreachMessage } from "@prisma/client";
import { AuditLogService } from "../common/audit-log.service";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { JobsService } from "../jobs/jobs.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { CHANNEL_SENDER, type ChannelSender } from "./channel-sender.interface";
import type { ApproveOutreachMessageDto } from "./dto/approve-outreach-message.dto";
import type { CreateOutreachMessageDto } from "./dto/create-outreach-message.dto";
import { SuppressionService } from "./suppression.service";

const CONTACT_TYPE_BY_CHANNEL: Record<string, string> = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
  SMS: "PHONE",
};

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly outbox: OutboxService,
    private readonly jobsService: JobsService,
    private readonly auditLog: AuditLogService,
    private readonly suppression: SuppressionService,
    @Inject(CHANNEL_SENDER) private readonly channelSender: ChannelSender,
  ) {}

  // Sem uma etapa separada de "submeter para aprovação" na API documentada
  // (seção 4.5, só create/approval/send-requests) — a mensagem já nasce
  // PENDING_APPROVAL, mesma simplificação de proposals.service.ts. Isso também
  // torna a transição DRAFT->SENT (proibida pela seção 3.3) inalcançável por
  // construção, não só "não permitida".
  async createMessage(
    organizationId: string,
    dto: CreateOutreachMessageDto,
    actorUserId: string,
  ): Promise<OutreachMessage> {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }

    const contactType = CONTACT_TYPE_BY_CHANNEL[dto.channel];
    const contact = await this.prisma.leadContact.findFirst({
      where: { leadId: dto.leadId, type: contactType, deletedAt: null },
    });
    if (!contact) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "Lead não possui contato para este canal",
        detail: `Nenhum contato do tipo ${contactType} encontrado para o lead.`,
        errorCode: "NO_CONTACT_FOR_CHANNEL",
      });
    }

    const message = await this.prisma.outreachMessage.create({
      data: {
        id: this.idService.generate(),
        organizationId,
        leadId: dto.leadId,
        channel: dto.channel,
        content: dto.content,
        recipientValue: contact.normalizedValue,
      },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: "OUTREACH_MESSAGE_CREATED",
      resourceType: "OUTREACH_MESSAGE",
      resourceId: message.id,
      changes: { leadId: dto.leadId, channel: dto.channel },
    });

    return message;
  }

  // Opt-out (docs/DOCUMENTATION.md seção 5.7): registra a supressão pelo hash
  // do contato já cadastrado no lead, sem endpoint dedicado a "informar um
  // valor de contato arbitrário" — supressão sempre nasce de um contato real
  // que já está no sistema.
  async suppressLeadContact(
    organizationId: string,
    leadId: string,
    channel: string,
    reason: string,
    actorUserId: string,
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }

    const contactType = CONTACT_TYPE_BY_CHANNEL[channel];
    const contact = await this.prisma.leadContact.findFirst({
      where: { leadId, type: contactType, deletedAt: null },
    });
    if (!contact) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, {
        title: "Lead não possui contato para este canal",
        errorCode: "NO_CONTACT_FOR_CHANNEL",
      });
    }

    await this.suppression.suppress(organizationId, channel, contact.normalizedValue, reason);
    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: "CONTACT_SUPPRESSED",
      resourceType: "LEAD",
      resourceId: leadId,
      changes: { channel, reason },
    });
  }

  async findOne(organizationId: string, id: string): Promise<OutreachMessage> {
    const message = await this.prisma.outreachMessage.findFirst({ where: { id, organizationId } });
    if (!message) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Mensagem não encontrada",
        errorCode: "OUTREACH_MESSAGE_NOT_FOUND",
      });
    }
    return message;
  }

  async findByLead(organizationId: string, leadId: string): Promise<OutreachMessage[]> {
    return this.prisma.outreachMessage.findMany({
      where: { organizationId, leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  async decide(
    organizationId: string,
    messageId: string,
    dto: ApproveOutreachMessageDto,
    actorUserId: string,
  ): Promise<OutreachMessage> {
    const message = await this.findOne(organizationId, messageId);
    if (message.status !== "PENDING_APPROVAL") {
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Mensagem não está aguardando aprovação",
        detail: `Status atual: ${message.status}.`,
        errorCode: "OUTREACH_MESSAGE_NOT_PENDING",
      });
    }

    const updated = await this.prisma.outreachMessage.update({
      where: { id: messageId },
      data: {
        status: dto.decision,
        approvedBy: actorUserId,
        rejectedReason: dto.decision === "REJECTED" ? (dto.comment ?? "Rejeitada sem motivo informado") : null,
      },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: dto.decision === "APPROVED" ? "OUTREACH_MESSAGE_APPROVED" : "OUTREACH_MESSAGE_REJECTED",
      resourceType: "OUTREACH_MESSAGE",
      resourceId: messageId,
      changes: { leadId: message.leadId, comment: dto.comment },
    });

    return updated;
  }

  // "Antes de sair de APPROVED para QUEUED, o canal e o valor normalizado do
  // destinatário são checados contra contact_suppressions; um contato
  // suprimido força a mensagem para REJECTED" (docs/DOCUMENTATION.md seção
  // 3.3) — não é um detalhe de implementação, é a barreira que impede
  // reimportação/novo contato depois de um opt-out.
  async requestSend(
    organizationId: string,
    messageId: string,
    correlationId: string,
    actorUserId: string,
  ): Promise<{ status: string; jobId: string | null }> {
    const message = await this.findOne(organizationId, messageId);
    if (message.status !== "APPROVED") {
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Mensagem não está aprovada",
        detail: `Status atual: ${message.status}.`,
        errorCode: "OUTREACH_MESSAGE_NOT_APPROVED",
      });
    }

    const suppressed = await this.suppression.isSuppressed(organizationId, message.channel, message.recipientValue);
    if (suppressed) {
      await this.prisma.outreachMessage.update({
        where: { id: messageId },
        data: { status: "REJECTED", rejectedReason: "Contato na lista de supressão" },
      });
      await this.auditLog.record({
        organizationId,
        actorUserId,
        action: "OUTREACH_MESSAGE_BLOCKED_SUPPRESSED",
        resourceType: "OUTREACH_MESSAGE",
        resourceId: messageId,
        changes: { leadId: message.leadId, channel: message.channel },
      });
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Envio bloqueado — contato suprimido",
        detail: "Este destinatário optou por não ser contatado por este canal.",
        errorCode: "CONTACT_SUPPRESSED",
      });
    }

    const { job } = await this.prisma.$transaction(async (tx) => {
      await tx.outreachMessage.update({ where: { id: messageId }, data: { status: "QUEUED" } });
      const job = await this.jobsService.create(tx, {
        organizationId,
        type: "OUTREACH_SEND",
        payload: { leadId: message.leadId, messageId },
      });
      await this.outbox.record(tx, {
        organizationId,
        eventType: "outreach.send.requested",
        correlationId,
        payload: { messageId, leadId: message.leadId, channel: message.channel },
      });
      return { job };
    });

    setImmediate(() => {
      this.processSend(organizationId, messageId, job.id).catch((error) =>
        this.logger.error(`Falha ao processar envio ${messageId}`, error as Error),
      );
    });

    return { status: "QUEUED", jobId: job.id };
  }

  private async processSend(organizationId: string, messageId: string, jobId: string): Promise<void> {
    await this.jobsService.markRunning(jobId);
    try {
      const message = await this.prisma.outreachMessage.findUniqueOrThrow({ where: { id: messageId } });
      const result = await this.channelSender.send({
        channel: message.channel,
        recipientValue: message.recipientValue,
        content: message.content,
      });
      await this.prisma.outreachMessage.update({
        where: { id: messageId },
        data: { status: "SENT", sentAt: result.sentAt },
      });
      await this.jobsService.markCompleted(jobId);
      await this.auditLog.record({
        organizationId,
        action: "OUTREACH_MESSAGE_SENT",
        resourceType: "OUTREACH_MESSAGE",
        resourceId: messageId,
        changes: { channel: message.channel },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha desconhecida no envio";
      await this.prisma.outreachMessage.update({
        where: { id: messageId },
        data: { status: "FAILED", failureReason: reason },
      });
      await this.jobsService.markFailed(jobId, reason);
    }
  }
}
