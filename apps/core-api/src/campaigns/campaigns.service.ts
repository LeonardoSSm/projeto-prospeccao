import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { Campaign, CampaignRun, Prisma } from "@prisma/client";
import { AppException } from "../common/exceptions/app.exception";
import { IdService } from "../common/id.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { JobsService } from "../jobs/jobs.service";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCampaignDto } from "./dto/create-campaign.dto";

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idService: IdService,
    private readonly outbox: OutboxService,
    private readonly jobsService: JobsService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  async create(organizationId: string, dto: CreateCampaignDto): Promise<Campaign> {
    return this.prisma.campaign.create({
      data: {
        id: this.idService.generate(),
        organizationId,
        name: dto.name,
        category: dto.category,
        geographicFilter: dto.geography as unknown as Prisma.InputJsonValue,
        discoveryFilters: dto.filters as unknown as Prisma.InputJsonValue,
        providers: dto.providers,
      },
    });
  }

  async findMany(organizationId: string): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: [{ updatedAt: "desc" }],
      take: 50,
    });
  }

  async findOne(organizationId: string, id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!campaign) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Campanha não encontrada",
        errorCode: "CAMPAIGN_NOT_FOUND",
      });
    }
    return campaign;
  }

  async findRun(organizationId: string, runId: string): Promise<CampaignRun & { campaign: Campaign }> {
    const run = await this.prisma.campaignRun.findFirst({
      where: { id: runId, campaign: { organizationId } },
      include: { campaign: true },
    });
    if (!run) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Execução de campanha não encontrada",
        errorCode: "CAMPAIGN_RUN_NOT_FOUND",
      });
    }
    return run;
  }

  // 202 Accepted: cria CampaignRun + Job + evento no Outbox na mesma transação
  // (ADR-005) e só então dispara a descoberta em background. A Fase 1 executa a
  // descoberta dentro do próprio processo do core-api (ver discovery.service.ts) —
  // não há round-trip por RabbitMQ aqui porque Discovery não é um serviço separado
  // do monólito (só o audit-worker é, por causa do Chromium).
  async createRun(
    organizationId: string,
    campaignId: string,
    correlationId: string,
    idempotencyKey?: string,
  ): Promise<{ run: CampaignRun; job: { id: string; type: string; status: string } }> {
    const campaign = await this.findOne(organizationId, campaignId);
    const geography = campaign.geographicFilter as { city: string; radiusKm: number };
    const filters = campaign.discoveryFilters as { maximumResults?: number };

    try {
      const { run, job } = await this.prisma.$transaction(async (tx) => {
        const run = await tx.campaignRun.create({
          data: {
            id: this.idService.generate(),
            campaignId: campaign.id,
            filtersSnapshot: { geography, filters } as unknown as Prisma.InputJsonValue,
          },
        });

        const job = await this.jobsService.create(tx, {
          organizationId,
          type: "CAMPAIGN_DISCOVERY",
          payload: { campaignId: campaign.id, campaignRunId: run.id },
        });
        if (idempotencyKey) {
          await tx.job.update({ where: { id: job.id }, data: { idempotencyKey } });
        }

        await this.outbox.record(tx, {
          organizationId,
          eventType: "campaign.run.requested",
          correlationId,
          payload: { campaignId: campaign.id, campaignRunId: run.id },
        });

        return { run, job };
      });

      setImmediate(() => {
        this.discoveryService
          .runCampaign({
            organizationId,
            campaignRunId: run.id,
            jobId: job.id,
            category: campaign.category,
            city: geography.city,
            radiusKm: geography.radiusKm,
            maxResults: filters.maximumResults ?? 100,
          })
          .catch((error) => this.logger.error("Falha ao iniciar descoberta em background", error));
      });

      return { run, job: { id: job.id, type: job.type, status: job.status } };
    } catch (error) {
      if (idempotencyKey && isUniqueConstraintError(error)) {
        return this.findRunByIdempotencyKey(organizationId, idempotencyKey);
      }
      throw error;
    }
  }

  private async findRunByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<{ run: CampaignRun; job: { id: string; type: string; status: string } }> {
    const job = await this.prisma.job.findFirst({
      where: { organizationId, type: "CAMPAIGN_DISCOVERY", idempotencyKey },
    });
    const payload = job?.payload as { campaignRunId?: string } | undefined;
    const run = payload?.campaignRunId
      ? await this.prisma.campaignRun.findUnique({ where: { id: payload.campaignRunId } })
      : null;

    if (!job || !run) {
      throw new AppException(HttpStatus.CONFLICT, {
        title: "Conflito de idempotência",
        detail: "Já existe uma requisição com esta Idempotency-Key, mas o registro associado não foi encontrado.",
        errorCode: "IDEMPOTENCY_CONFLICT",
      });
    }
    return { run, job: { id: job.id, type: job.type, status: job.status } };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
