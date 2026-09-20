import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { ApproveOutreachMessageDto } from "./dto/approve-outreach-message.dto";
import { CreateOutreachMessageDto } from "./dto/create-outreach-message.dto";
import { SuppressContactDto } from "./dto/suppress-contact.dto";
import { OutreachService } from "./outreach.service";

@ApiTags("outreach")
@Controller()
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post("outreach-messages")
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Body() dto: CreateOutreachMessageDto,
  ) {
    return this.outreachService.createMessage(organizationId, dto, actorUserId);
  }

  @Get("outreach-messages/:id")
  findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.outreachService.findOne(organizationId, id);
  }

  @Post("outreach-messages/:id/approval")
  decide(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: ApproveOutreachMessageDto,
  ) {
    return this.outreachService.decide(organizationId, id, dto, actorUserId);
  }

  @Post("outreach-messages/:id/send-requests")
  @HttpCode(HttpStatus.ACCEPTED)
  requestSend(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Param("id") id: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.outreachService.requestSend(organizationId, id, correlationId, actorUserId);
  }

  @Get("leads/:leadId/outreach-messages")
  findByLead(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    return this.outreachService.findByLead(organizationId, leadId);
  }

  @Post("leads/:leadId/suppressions")
  @HttpCode(HttpStatus.CREATED)
  async suppress(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Param("leadId") leadId: string,
    @Body() dto: SuppressContactDto,
  ) {
    await this.outreachService.suppressLeadContact(organizationId, leadId, dto.channel, dto.reason, actorUserId);
    return { suppressed: true };
  }
}
