import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AiAnalysis } from "@prisma/client";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { AiAnalysesService } from "./ai-analyses.service";
import { CreateAiAnalysisDto } from "./dto/create-ai-analysis.dto";

// Formato alinhado a docs/DOCUMENTATION.md seção 4.12.
function toAnalysisResponse(analysis: AiAnalysis) {
  return {
    id: analysis.id,
    status: analysis.status,
    reviewStatus: analysis.reviewStatus,
    diagnosis: analysis.output,
    generation: {
      promptVersion: analysis.promptVersion,
      modelAlias: analysis.modelName,
      generatedAt: analysis.createdAt,
      tokensUsed: analysis.tokensUsed,
      latencyMs: analysis.latencyMs,
    },
    failureReason: analysis.failureReason,
  };
}

@ApiTags("intelligence")
@Controller("leads/:leadId/ai-analyses")
export class AiAnalysesController {
  constructor(private readonly aiAnalysesService: AiAnalysesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  requestAnalysis(
    @CurrentOrganizationId() organizationId: string,
    @Param("leadId") leadId: string,
    @Body() dto: CreateAiAnalysisDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.aiAnalysesService.requestAnalysis(organizationId, leadId, dto, correlationId);
  }

  @Get()
  async findMany(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    const items = await this.aiAnalysesService.findMany(organizationId, leadId);
    return { items: items.map(toAnalysisResponse) };
  }

  @Get(":analysisId")
  async findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("leadId") leadId: string,
    @Param("analysisId") analysisId: string,
  ) {
    return toAnalysisResponse(await this.aiAnalysesService.findOne(organizationId, leadId, analysisId));
  }
}
