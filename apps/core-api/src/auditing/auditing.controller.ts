import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuditFinding, WebsiteAudit, WebsiteSnapshot } from "@prisma/client";
import { CorrelationId } from "../common/decorators/correlation-id.decorator";
import { CurrentOrganizationId } from "../common/decorators/current-organization.decorator";
import { AuditingService } from "./auditing.service";
import { CreateAuditRequestDto } from "./dto/create-audit-request.dto";

type AuditWithRelations = WebsiteAudit & { snapshot: WebsiteSnapshot; findings: AuditFinding[] };

// Formato alinhado a docs/DOCUMENTATION.md seção 4.10.
function toAuditResponse(audit: AuditWithRelations) {
  const metrics = (audit.technicalMetrics ?? {}) as Record<string, unknown>;
  return {
    id: audit.id,
    status: audit.status,
    requestedUrl: audit.snapshot.requestedUrl,
    finalUrl: audit.snapshot.finalUrl,
    capturedAt: audit.snapshot.capturedAt,
    http: {
      status: audit.snapshot.httpStatus,
      https: metrics.https ?? null,
      redirectCount: metrics.redirectCount ?? null,
    },
    lighthouse:
      audit.performanceScore == null
        ? null
        : {
            performance: audit.performanceScore,
            accessibility: audit.accessibilityScore,
            bestPractices: audit.bestPracticesScore,
            seo: audit.seoScore,
            metrics,
          },
    features: audit.featuresDetected,
    findings: audit.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      category: finding.category,
      evidence: finding.evidence,
    })),
    failureReason: audit.failureReason,
    createdAt: audit.createdAt,
  };
}

@ApiTags("auditing")
@Controller("leads/:leadId")
export class AuditingController {
  constructor(private readonly auditingService: AuditingService) {}

  @Post("audit-requests")
  @HttpCode(HttpStatus.ACCEPTED)
  requestAudit(
    @CurrentOrganizationId() organizationId: string,
    @Param("leadId") leadId: string,
    @Body() dto: CreateAuditRequestDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.auditingService.requestAudit(organizationId, leadId, dto, correlationId);
  }

  @Get("audits")
  async findMany(@CurrentOrganizationId() organizationId: string, @Param("leadId") leadId: string) {
    const audits = await this.auditingService.findMany(organizationId, leadId);
    return { items: audits.map(toAuditResponse) };
  }
}
