import { Global, Module } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { IdService } from "./id.service";
import { NormalizationService } from "./normalization.service";

@Global()
@Module({
  providers: [IdService, NormalizationService, AuditLogService],
  exports: [IdService, NormalizationService, AuditLogService],
})
export class CommonModule {}
