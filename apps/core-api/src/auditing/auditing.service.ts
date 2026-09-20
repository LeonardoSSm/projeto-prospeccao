import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { Prisma, WebsiteAudit } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { JobsService } from "../jobs/jobs.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { ScoringService } from "../scoring/scoring.service";
import type { CreateAuditRequestDto } from "./dto/create-audit-request.dto";
import type { AuditCompletedPayload, AuditFailedPayload } from "./audit-results.types";

const RECENT_AUDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_SECONDS = 90;

@Injectable()
export class AuditingService {
  private readonly logger = new Logger(AuditingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly outbox: OutboxService,
    private readonly jobsService: JobsService,
    private readonly scoringService: ScoringService,
  ) {}

  private async requireLead(organizationId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Lead não encontrado",
        errorCode: "LEAD_NOT_FOUND",
      });
    }
    return lead;
  }

  async requestAudit(
    organizationId: string,
    leadId: string,
    dto: CreateAuditRequestDto,
    correlationId: string,
  ): Promise<{ auditRequestId: string; status: string; jobId: string | null }> {
    await this.requireLead(organizationId, leadId);

    if (!dto.force) {
      const recent = await this.prisma.websiteAudit.findFirst({
        where: {
          status: "COMPLETED",
          createdAt: { gte: new Date(Date.now() - RECENT_AUDIT_WINDOW_MS) },
          snapshot: { leadId, requestedUrl: dto.url },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent) {
        return { auditRequestId: recent.id, status: recent.status, jobId: null };
      }
    }

    const { audit, job } = await this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.websiteSnapshot.create({
        data: { id: this.idService.generate(), leadId, requestedUrl: dto.url },
      });
      const audit = await tx.websiteAudit.create({
        data: { id: this.idService.generate(), websiteSnapshotId: snapshot.id },
      });
      const job = await this.jobsService.create(tx, {
        organizationId,
        type: "AUDIT_REQUEST",
        payload: { leadId, auditId: audit.id },
      });
      await this.outbox.record(tx, {
        organizationId,
        eventType: "website.audit.requested",
        correlationId,
        payload: {
          auditRequestId: audit.id,
          leadId,
          url: dto.url,
          profile: dto.profile,
          timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
        },
      });
      return { audit, job };
    });

    return { auditRequestId: audit.id, status: audit.status, jobId: job.id };
  }

  async findMany(organizationId: string, leadId: string) {
    await this.requireLead(organizationId, leadId);
    return this.prisma.websiteAudit.findMany({
      where: { snapshot: { leadId } },
      include: { snapshot: true, findings: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Chamado pelo consumidor RabbitMQ (audit-results.consumer.ts) quando o
  // audit-worker termina uma auditoria com sucesso.
  async applyCompleted(payload: AuditCompletedPayload, correlationId: string): Promise<void> {
    const audit = await this.findAuditOrWarn(payload.auditRequestId);
    if (!audit) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.websiteSnapshot.update({
        where: { id: audit.websiteSnapshotId },
        data: {
          finalUrl: payload.finalUrl,
          httpStatus: payload.http.status,
          contentHash: payload.contentHash,
        },
      });
      await tx.websiteAudit.update({
        where: { id: audit.id },
        data: {
          status: "COMPLETED",
          engineVersion: payload.engineVersion,
          performanceScore: payload.lighthouse.performance,
          accessibilityScore: payload.lighthouse.accessibility,
          seoScore: payload.lighthouse.seo,
          bestPracticesScore: payload.lighthouse.bestPractices,
          technicalMetrics: {
            ...payload.lighthouse.metrics,
            https: payload.http.https,
            redirectCount: payload.http.redirectCount,
          } as Prisma.InputJsonValue,
          featuresDetected: payload.features as Prisma.InputJsonValue,
          reportObjectKey: payload.reportObjectKey,
          screenshotObjectKey: payload.screenshotObjectKey,
        },
      });
      for (const finding of payload.findings) {
        await tx.auditFinding.create({
          data: {
            id: this.idService.generate(),
            websiteAuditId: audit.id,
            code: finding.code,
            severity: finding.severity,
            category: finding.category,
            evidence: finding.evidence as Prisma.InputJsonValue,
          },
        });
      }
    });

    await this.completeRelatedJob(payload.auditRequestId);
    await this.triggerScoring(payload.leadId, correlationId);
  }

  async applyFailed(payload: AuditFailedPayload, correlationId: string): Promise<void> {
    const audit = await this.findAuditOrWarn(payload.auditRequestId);
    if (!audit) return;

    await this.prisma.websiteAudit.update({
      where: { id: audit.id },
      data: { status: "FAILED", failureReason: payload.reason },
    });

    const job = await this.prisma.job.findFirst({
      where: { type: "AUDIT_REQUEST", payload: { path: ["auditId"], equals: audit.id } },
    });
    if (job) {
      await this.jobsService.markFailed(job.id, payload.reason);
    }
    // Site inalcançável também é evidência de score (fator SITE_UNREACHABLE).
    await this.triggerScoring(payload.leadId, correlationId);
  }

  private async triggerScoring(leadId: string, correlationId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;
    try {
      await this.scoringService.calculateScore(lead.organizationId, leadId, correlationId);
    } catch (error) {
      this.logger.error(`Falha ao calcular score automaticamente para o lead ${leadId}`, error as Error);
    }
  }

  private async findAuditOrWarn(auditId: string): Promise<WebsiteAudit | null> {
    const audit = await this.prisma.websiteAudit.findUnique({ where: { id: auditId } });
    if (!audit) {
      this.logger.warn(`Resultado recebido para auditoria desconhecida: ${auditId}`);
    }
    return audit;
  }

  private async completeRelatedJob(auditId: string): Promise<void> {
    const job = await this.prisma.job.findFirst({
      where: { type: "AUDIT_REQUEST", payload: { path: ["auditId"], equals: auditId } },
    });
    if (job) {
      await this.jobsService.markCompleted(job.id);
    }
  }
}
