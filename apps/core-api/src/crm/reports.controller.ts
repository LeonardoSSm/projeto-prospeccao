import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CrmService } from "./crm.service";

// Relatório mínimo (docs/DOCUMENTATION.md seção 8.14, Fase 5: "...e relatórios";
// seção 8.9 métrica de negócio "leads por estágio").
@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly crmService: CrmService) {}

  @Get("funnel")
  async funnel(@CurrentOrganizationId() organizationId: string) {
    const stages = await this.crmService.funnelSummary(organizationId);
    return { stages };
  }
}
