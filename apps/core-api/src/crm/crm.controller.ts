import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { CrmService } from "./crm.service";
import { UpdateCrmDto } from "./dto/update-crm.dto";

function parseIfMatch(header: string | undefined): number | undefined {
  if (!header) return undefined;
  const value = Number(header.replace(/"/g, "").trim());
  return Number.isFinite(value) ? value : undefined;
}

@ApiTags("crm")
@Controller("leads/:leadId")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Patch("crm")
  updateCrm(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Param("leadId") leadId: string,
    @Body() dto: UpdateCrmDto,
    @CorrelationId() correlationId: string,
    @Headers("if-match") ifMatch?: string,
  ) {
    return this.crmService.updateCrm(
      organizationId,
      leadId,
      dto,
      parseIfMatch(ifMatch),
      correlationId,
      actorUserId,
    );
  }

  @Get("activities")
  listActivities(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    return this.crmService.listActivities(organizationId, leadId);
  }
}
