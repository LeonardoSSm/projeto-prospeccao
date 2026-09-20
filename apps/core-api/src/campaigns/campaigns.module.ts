import { Module } from "@nestjs/common";
import { DiscoveryModule } from "../discovery/discovery.module";
import { JobsModule } from "../jobs/jobs.module";
import { CampaignRunsController } from "./campaign-runs.controller";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

@Module({
  imports: [DiscoveryModule, JobsModule],
  controllers: [CampaignsController, CampaignRunsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
