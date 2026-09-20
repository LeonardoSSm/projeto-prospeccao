import { Module } from "@nestjs/common";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";
import { ReportsController } from "./reports.controller";

@Module({
  controllers: [CrmController, ReportsController],
  providers: [CrmService],
})
export class CrmModule {}
