import { Module } from "@nestjs/common";
import { LeadsModule } from "../leads/leads.module";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";

@Module({
  imports: [LeadsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
