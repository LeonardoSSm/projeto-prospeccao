import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { LeadsModule } from "../leads/leads.module";
import { ScoringModule } from "../scoring/scoring.module";
import { AuditingController } from "./auditing.controller";
import { AuditingService } from "./auditing.service";
import { AuditResultsConsumerService } from "./audit-results.consumer";

@Module({
  imports: [JobsModule, ScoringModule, LeadsModule],
  controllers: [AuditingController],
  providers: [AuditingService, AuditResultsConsumerService],
  exports: [AuditingService],
})
export class AuditingModule {}
