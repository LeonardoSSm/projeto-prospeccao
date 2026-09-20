import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Lead } from "@prisma/client";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { ListLeadsQueryDto } from "./dto/list-leads.query.dto";
import { LeadsService } from "./leads.service";

// Formato de resposta alinhado a docs/DOCUMENTATION.md seção 4.8. `scoreBand` só
// existe a partir da Fase 3 (Scoring) — por ora sempre null.
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
    scoreBand: null as string | null,
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
}
