import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Campaign } from "@prisma/client";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { IdempotencyKey } from "../common/decorators/idempotency-key.decorator";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";

function toCampaignResponse(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    category: campaign.category,
    geography: campaign.geographicFilter,
    filters: campaign.discoveryFilters,
    providers: campaign.providers,
    createdAt: campaign.createdAt,
    version: campaign.version,
  };
}

@ApiTags("campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentOrganizationId() organizationId: string, @Body() dto: CreateCampaignDto) {
    const campaign = await this.campaignsService.create(organizationId, dto);
    return toCampaignResponse(campaign);
  }

  @Get()
  async findMany(@CurrentOrganizationId() organizationId: string) {
    const campaigns = await this.campaignsService.findMany(organizationId);
    return { items: campaigns.map(toCampaignResponse) };
  }

  @Get(":id")
  async findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return toCampaignResponse(await this.campaignsService.findOne(organizationId, id));
  }

  @Post(":id/runs")
  @HttpCode(HttpStatus.ACCEPTED)
  async createRun(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @CorrelationId() correlationId: string,
    @IdempotencyKey() idempotencyKey: string | undefined,
  ) {
    const { run, job } = await this.campaignsService.createRun(
      organizationId,
      id,
      correlationId,
      idempotencyKey,
    );
    return {
      run: {
        id: run.id,
        campaignId: run.campaignId,
        status: run.status,
        counters: {
          discovered: run.discoveredCount,
          accepted: run.acceptedCount,
          duplicates: run.duplicateCount,
          failed: run.failedCount,
        },
      },
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        links: { self: `/api/v1/jobs/${job.id}` },
      },
    };
  }
}
