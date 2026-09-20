import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import type { AiAnalysis, Prisma } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { JobsService } from "../jobs/jobs.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateAiAnalysisDto } from "./dto/create-ai-analysis.dto";
import { buildEvidenceSnapshot, type DiagnosisEvidence } from "./evidence-snapshot";
import { evidencePathExists } from "./evidence-path.util";
import { LLM_PROVIDER, type DiagnosisOutput, type LlmProvider } from "./providers/llm-provider.interface";

@Injectable()
export class AiAnalysesService {
  private readonly logger = new Logger(AiAnalysesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly outbox: OutboxService,
    private readonly jobsService: JobsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  async requestAnalysis(
    organizationId: string,
    leadId: string,
    dto: CreateAiAnalysisDto,
    correlationId: string,
  ): Promise<{ analysisId: string; status: string; jobId: string }> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) {
      throw new AppException(HttpStatus.NOT_FOUND, { title: "Lead não encontrado", errorCode: "LEAD_NOT_FOUND" });
    }

    const evidence = await this.buildEvidence(leadId);

    const { analysis, job } = await this.prisma.$transaction(async (tx) => {
      const analysis = await tx.aiAnalysis.create({
        data: {
          id: this.idService.generate(),
          organizationId,
          leadId,
          kind: dto.kind,
          inputSnapshot: evidence as unknown as Prisma.InputJsonValue,
        },
      });
      const job = await this.jobsService.create(tx, {
        organizationId,
        type: "AI_ANALYSIS",
        payload: { leadId, analysisId: analysis.id },
      });
      await this.outbox.record(tx, {
        organizationId,
        eventType: "ai.analysis.requested",
        correlationId,
        payload: { analysisId: analysis.id, leadId, kind: dto.kind },
      });
      return { analysis, job };
    });

    setImmediate(() => {
      this.runAnalysis(analysis.id, job.id, dto, evidence).catch((error) =>
        this.logger.error(`Falha ao gerar diagnóstico ${analysis.id}`, error as Error),
      );
    });

    return { analysisId: analysis.id, status: analysis.status, jobId: job.id };
  }

  async findOne(organizationId: string, leadId: string, analysisId: string): Promise<AiAnalysis> {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      where: { id: analysisId, leadId, organizationId },
    });
    if (!analysis) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Diagnóstico não encontrado",
        errorCode: "AI_ANALYSIS_NOT_FOUND",
      });
    }
    return analysis;
  }

  async findMany(organizationId: string, leadId: string): Promise<AiAnalysis[]> {
    return this.prisma.aiAnalysis.findMany({
      where: { organizationId, leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async buildEvidence(leadId: string): Promise<DiagnosisEvidence> {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    const latestAudit = await this.prisma.websiteAudit.findFirst({
      where: { snapshot: { leadId } },
      orderBy: { createdAt: "desc" },
    });
    const latestScore = await this.prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { calculatedAt: "desc" },
      include: { factors: true },
    });

    return buildEvidenceSnapshot({
      lead,
      latestAudit: latestAudit
        ? {
            status: latestAudit.status,
            performanceScore: latestAudit.performanceScore,
            accessibilityScore: latestAudit.accessibilityScore,
            seoScore: latestAudit.seoScore,
            bestPracticesScore: latestAudit.bestPracticesScore,
            featuresDetected: latestAudit.featuresDetected as Record<string, unknown> | null,
            technicalMetrics: latestAudit.technicalMetrics as Record<string, unknown> | null,
          }
        : null,
      latestScore: latestScore
        ? { totalScore: latestScore.totalScore, band: latestScore.band, factors: latestScore.factors }
        : null,
    });
  }

  private async runAnalysis(
    analysisId: string,
    jobId: string,
    dto: CreateAiAnalysisDto,
    evidence: DiagnosisEvidence,
  ): Promise<void> {
    await this.jobsService.markRunning(jobId);
    await this.prisma.aiAnalysis.update({ where: { id: analysisId }, data: { status: "RUNNING" } });

    try {
      const result = await this.llmProvider.generateDiagnosis({
        evidence,
        language: dto.language,
        tone: dto.tone,
      });

      const output = this.sanitizeOutput(result.output, evidence);

      await this.prisma.aiAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "COMPLETED",
          modelName: result.modelName,
          promptVersion: result.promptVersion,
          output: output as unknown as Prisma.InputJsonValue,
          tokensUsed: result.tokensUsed,
          latencyMs: result.latencyMs,
          estimatedCostUsd: result.estimatedCostUsd,
        },
      });
      await this.jobsService.markCompleted(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida na geração do diagnóstico";
      await this.prisma.aiAnalysis.update({
        where: { id: analysisId },
        data: { status: "FAILED", failureReason: message },
      });
      await this.jobsService.markFailed(jobId, message);
    }
  }

  // "Recomendações só podem citar evidências presentes no snapshot de entrada"
  // (docs/DOCUMENTATION.md seção 5.5) — descarta qualquer strength/problem cujo
  // evidencePath não exista de fato no snapshot, em vez de confiar no modelo.
  private sanitizeOutput(output: DiagnosisOutput, evidence: DiagnosisEvidence): DiagnosisOutput {
    return {
      ...output,
      strengths: output.strengths.filter((item) => evidencePathExists(evidence, item.evidencePath)),
      problems: output.problems.filter((item) => evidencePathExists(evidence, item.evidencePath)),
    };
  }
}
