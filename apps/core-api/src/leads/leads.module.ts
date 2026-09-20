import { Module } from "@nestjs/common";
import { GeocodingModule } from "../discovery/geocoding/geocoding.module";
import { ScoringModule } from "../scoring/scoring.module";
import { DedupeService } from "./dedupe.service";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [ScoringModule, GeocodingModule],
  controllers: [LeadsController],
  providers: [LeadsService, DedupeService],
  exports: [LeadsService],
})
export class LeadsModule {}
