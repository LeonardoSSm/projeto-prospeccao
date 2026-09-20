import { Body, Controller, Get, Headers, Param, Patch, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Lead } from "@prisma/client";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { CurrentUserId } from "../common/decorators/current-user.decorator";
import { bandFor } from "../scoring/policies/policy-2026-09-v1";
import { ListLeadsQueryDto } from "./dto/list-leads.query.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadsService } from "./leads.service";

function parseIfMatch(header: string | undefined): number | undefined {
  if (!header) return undefined;
  const value = Number(header.replace(/"/g, "").trim());
  return Number.isFinite(value) ? value : undefined;
}

// Formato de resposta alinhado a docs/DOCUMENTATION.md seção 4.8.
function toListItem(lead: Lead) {
  return {
    id: lead.id,
    tradeName: lead.tradeName ?? lead.legalName,
    category: lead.category,
    city: lead.city,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    website: lead.websiteUrl,
    websiteStatus: lead.websiteStatus,
    currentScore: lead.currentScore,
    scoreBand: lead.currentScore == null ? null : bandFor(lead.currentScore),
    crmStage: lead.crmStage,
    nextActionAt: lead.nextActionAt,
    updatedAt: lead.updatedAt,
  };
}

@ApiTags("leads")
@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findMany(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ListLeadsQueryDto,
  ) {
    const result = await this.leadsService.findMany(organizationId, query);
    return {
      items: result.items.map(toListItem),
      page: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        limit: query.limit,
      },
    };
  }

  @Get(":id")
  findOne(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.leadsService.findOne(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() actorUserId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
    @Headers("if-match") ifMatch?: string,
  ) {
    return this.leadsService.update(organizationId, id, dto, parseIfMatch(ifMatch), actorUserId);
  }
}
