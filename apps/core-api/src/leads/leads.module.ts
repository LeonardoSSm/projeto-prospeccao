import { Module } from "@nestjs/common";
import { ScoringModule } from "../scoring/scoring.module";
import { DedupeService } from "./dedupe.service";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [ScoringModule],
  controllers: [LeadsController],
  providers: [LeadsService, DedupeService],
  exports: [LeadsService],
})
export class LeadsModule {}
