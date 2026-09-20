import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CampaignsService } from "./campaigns.service";

@ApiTags("campaigns")
@Controller("campaign-runs")
export class CampaignRunsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(":id")
  async findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    const run = await this.campaignsService.findRun(organizationId, id);
    return {
      id: run.id,
      campaignId: run.campaignId,
      status: run.status,
      counters: {
        discovered: run.discoveredCount,
        accepted: run.acceptedCount,
        duplicates: run.duplicateCount,
        failed: run.failedCount,
      },
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      failureReason: run.failureReason,
    };
  }
}
