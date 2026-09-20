import { Inject, Injectable, Logger } from "@nestjs/common";
import { JobsService } from "../jobs/jobs.service";
import { LeadsService } from "../leads/leads.service";
import { PrismaService } from "../prisma/prisma.service";
import { PLACES_PROVIDER, type PlacesProvider } from "./providers/places-provider.interface";

export interface RunCampaignParams {
  organizationId: string;
  campaignRunId: string;
  jobId: string;
  category: string;
  city: string;
  radiusKm: number;
  maxResults: number;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @Inject(PLACES_PROVIDER) private readonly provider: PlacesProvider,
    private readonly leadsService: LeadsService,
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  // Executado em background pelo CampaignsService logo após a transação que cria
  // CampaignRun/Job/OutboxEvent ser confirmada (ver nota em campaigns.service.ts
  // sobre por que isso roda em processo em vez de via consumidor RabbitMQ na Fase 1).
  async runCampaign(params: RunCampaignParams): Promise<void> {
    await this.jobsService.markRunning(params.jobId);
    await this.prisma.campaignRun.update({
      where: { id: params.campaignRunId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      const places = await this.provider.search({
        category: params.category,
        city: params.city,
        radiusKm: params.radiusKm,
        maxResults: params.maxResults,
      });

      let accepted = 0;
      let duplicates = 0;
      let failed = 0;

      for (const place of places) {
        try {
          const result = await this.leadsService.upsertFromSource({
            organizationId: params.organizationId,
            provider: this.provider.name,
            externalId: place.externalId,
            campaignRunId: params.campaignRunId,
            legalName: place.legalName,
            tradeName: place.tradeName,
            category: place.category,
            categoriesRaw: place.categoriesRaw,
            addressLine: place.addressLine,
            city: place.city,
            state: place.state,
            country: place.country,
            latitude: place.latitude,
            longitude: place.longitude,
            phone: place.phone,
            whatsapp: place.whatsapp,
            instagram: place.instagram,
            websiteUrl: place.websiteUrl,
            rating: place.rating,
            reviewCount: place.reviewCount,
            rawPayload: place.raw,
          });
          if (result.matchKind === "MATCH") {
            duplicates += 1;
          } else {
            accepted += 1;
          }
        } catch (error) {
          failed += 1;
          this.logger.error(
            `Falha ao processar resultado ${place.externalId} da campanha ${params.campaignRunId}`,
            error as Error,
          );
        }
      }

      await this.prisma.campaignRun.update({
        where: { id: params.campaignRunId },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          discoveredCount: places.length,
          acceptedCount: accepted,
          duplicateCount: duplicates,
          failedCount: failed,
        },
      });
      await this.jobsService.markCompleted(params.jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida na descoberta";
      this.logger.error(`Campanha ${params.campaignRunId} falhou`, error as Error);
      await this.prisma.campaignRun.update({
        where: { id: params.campaignRunId },
        data: { status: "FAILED", finishedAt: new Date(), failureReason: message },
      });
      await this.jobsService.markFailed(params.jobId, message);
    }
  }
}
