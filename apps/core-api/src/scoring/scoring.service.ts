import { HttpStatus, Injectable } from "@nestjs/common";
import type { LeadScore, Prisma, ScoreFactor } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { bandFor, evaluate, POLICY_VERSION } from "./policies/policy-2026-09-v1";

export type LeadScoreWithFactors = LeadScore & { factors: ScoreFactor[] };

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly outbox: OutboxService,
  ) {}

  // Síncrono e determinístico (docs/DOCUMENTATION.md ADR-008): mesma entrada,
  // mesma política -> mesmo score, sempre. Chamado tanto sob demanda
  // (POST /leads/{id}/score-calculations) quanto automaticamente pelo pipeline
  // (Discovery para NO_WEBSITE, Auditing quando uma auditoria conclui).
  async calculateScore(
    organizationId: string,
    leadId: string,
    correlationId: string,
  ): Promise<LeadScoreWithFactors> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Lead não encontrado",
        errorCode: "LEAD_NOT_FOUND",
      });
    }

    const latestAudit = await this.prisma.websiteAudit.findFirst({
      where: { snapshot: { leadId } },
      orderBy: { createdAt: "desc" },
    });

    const factors = evaluate({
      websiteStatus: lead.websiteStatus,
      rating: lead.rating,
      reviewCount: lead.reviewCount,
      latestAudit: latestAudit
        ? {
            id: latestAudit.id,
            status: latestAudit.status,
            performanceScore: latestAudit.performanceScore,
            seoScore: latestAudit.seoScore,
            featuresDetected: latestAudit.featuresDetected as Record<string, unknown> | null,
            technicalMetrics: latestAudit.technicalMetrics as Record<string, unknown> | null,
            failureReason: latestAudit.failureReason,
          }
        : null,
    });

    const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0);
    const totalScore = Math.max(0, Math.min(100, rawScore));
    const band = bandFor(totalScore);

    const leadScore = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leadScore.create({
        data: {
          id: this.idService.generate(),
          leadId,
          policyVersion: POLICY_VERSION,
          rawScore,
          totalScore,
          band,
        },
      });
      for (const factor of factors) {
        await tx.scoreFactor.create({
          data: {
            id: this.idService.generate(),
            leadScoreId: created.id,
            factorCode: factor.code,
            points: factor.points,
            evidence: factor.evidence as Prisma.InputJsonValue,
          },
        });
      }
      await tx.lead.update({ where: { id: leadId }, data: { currentScore: totalScore } });
      await this.outbox.record(tx, {
        organizationId,
        eventType: "lead.score.calculated",
        correlationId,
        payload: { leadId, leadScoreId: created.id, policyVersion: POLICY_VERSION, totalScore, band },
      });
      return created;
    });

    return { ...leadScore, factors: await this.prisma.scoreFactor.findMany({ where: { leadScoreId: leadScore.id } }) };
  }

  async findLatest(organizationId: string, leadId: string): Promise<LeadScoreWithFactors | null> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Lead não encontrado",
        errorCode: "LEAD_NOT_FOUND",
      });
    }
    return this.prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { calculatedAt: "desc" },
      include: { factors: true },
    });
  }
}
