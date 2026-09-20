import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { ApproveProposalDto } from "./dto/approve-proposal.dto";
import { ProposalsService } from "./proposals.service";

@ApiTags("intelligence")
@Controller()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post("leads/:leadId/proposals")
  @HttpCode(HttpStatus.CREATED)
  generateDraft(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    return this.proposalsService.generateDraft(organizationId, leadId);
  }

  @Get("proposals/:id")
  findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.proposalsService.findOne(organizationId, id);
  }

  @Post("proposals/:id/approval")
  decide(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: ApproveProposalDto,
  ) {
    return this.proposalsService.decide(organizationId, id, dto);
  }
}
