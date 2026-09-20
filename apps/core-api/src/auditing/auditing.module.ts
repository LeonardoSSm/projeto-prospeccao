import { Module } from "@nestjs/common";
import { JobsModule } from "../jobs/jobs.module";
import { AuditingController } from "./auditing.controller";
import { AuditingService } from "./auditing.service";
import { AuditResultsConsumerService } from "./audit-results.consumer";

@Module({
  imports: [JobsModule],
  controllers: [AuditingController],
  providers: [AuditingService, AuditResultsConsumerService],
  exports: [AuditingService],
})
export class AuditingModule {}
