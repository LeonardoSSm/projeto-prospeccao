import { Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { AppException } from "../common/exceptions/app.exception";
import { type LeadScoreWithFactors, ScoringService } from "./scoring.service";

// Formato alinhado a docs/DOCUMENTATION.md seção 4.11.
// eligibleForOutreach é sempre true por ora — a lista de supressão de contato
// (fator DO_NOT_CONTACT) só existe a partir da Fase 6 (Outreach).
function toScoreResponse(leadId: string, score: LeadScoreWithFactors) {
  return {
    leadId,
    policyVersion: score.policyVersion,
    rawScore: score.rawScore,
    totalScore: score.totalScore,
    band: score.band,
    eligibleForOutreach: true,
    factors: score.factors.map((factor) => ({
      code: factor.factorCode,
      points: factor.points,
      evidence: factor.evidence,
    })),
    calculatedAt: score.calculatedAt,
  };
}

@ApiTags("scoring")
@Controller("leads/:leadId")
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post("score-calculations")
  @HttpCode(HttpStatus.CREATED)
  async calculate(
    @CurrentOrganizationId() organizationId: string,
    @Param("leadId") leadId: string,
    @CorrelationId() correlationId: string,
  ) {
    const score = await this.scoringService.calculateScore(organizationId, leadId, correlationId);
    return toScoreResponse(leadId, score);
  }

  @Get("score")
  async findLatest(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    const score = await this.scoringService.findLatest(organizationId, leadId);
    if (!score) {
      throw new AppException(HttpStatus.NOT_FOUND, {
        title: "Lead ainda não possui score calculado",
        errorCode: "LEAD_SCORE_NOT_FOUND",
      });
    }
    return toScoreResponse(leadId, score);
  }
}
