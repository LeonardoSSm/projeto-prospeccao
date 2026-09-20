import { Module } from "@nestjs/common";
import { DedupeService } from "./dedupe.service";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, DedupeService],
  exports: [LeadsService],
})
export class LeadsModule {}
