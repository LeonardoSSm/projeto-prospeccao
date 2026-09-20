// Snapshot de evidência enviado ao provedor de IA (docs/DOCUMENTATION.md seção 5.5):
// só campos selecionados e estruturados — nunca HTML bruto, URL completa, screenshot
// ou dado de contato (telefone/e-mail/WhatsApp). O conteúdo do site é dado não
// confiável e não deve virar instrução; por isso nem sequer entra aqui.
export interface DiagnosisEvidence {
  lead: {
    tradeName: string;
    category: string;
    city: string;
    rating: number | null;
    reviewCount: number | null;
    websiteStatus: string;
  };
  audit: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
    mobileFriendly: boolean | null;
    hasWhatsAppCta: boolean | null;
    hasContactForm: boolean | null;
    https: boolean | null;
  } | null;
  score: {
    totalScore: number | null;
    band: string | null;
    factors: Array<{ code: string; points: number }>;
  } | null;
}

interface BuildEvidenceInput {
  lead: {
    tradeName: string | null;
    legalName: string;
    category: string;
    city: string;
    rating: number | null;
    reviewCount: number | null;
    websiteStatus: string;
  };
  latestAudit: {
    status: string;
    performanceScore: number | null;
    accessibilityScore: number | null;
    seoScore: number | null;
    bestPracticesScore: number | null;
    featuresDetected: Record<string, unknown> | null;
    technicalMetrics: Record<string, unknown> | null;
  } | null;
  latestScore: {
    totalScore: number;
    band: string;
    factors: Array<{ factorCode: string; points: number }>;
  } | null;
}

export function buildEvidenceSnapshot(input: BuildEvidenceInput): DiagnosisEvidence {
  const features = (input.latestAudit?.featuresDetected ?? {}) as Record<string, unknown>;
  const metrics = (input.latestAudit?.technicalMetrics ?? {}) as Record<string, unknown>;

  return {
    lead: {
      tradeName: input.lead.tradeName ?? input.lead.legalName,
      category: input.lead.category,
      city: input.lead.city,
      rating: input.lead.rating,
      reviewCount: input.lead.reviewCount,
      websiteStatus: input.lead.websiteStatus,
    },
    audit:
      input.latestAudit?.status === "COMPLETED"
        ? {
            performance: input.latestAudit.performanceScore,
            accessibility: input.latestAudit.accessibilityScore,
            seo: input.latestAudit.seoScore,
            bestPractices: input.latestAudit.bestPracticesScore,
            mobileFriendly: typeof features.mobileFriendly === "boolean" ? features.mobileFriendly : null,
            hasWhatsAppCta: typeof features.hasWhatsAppCta === "boolean" ? features.hasWhatsAppCta : null,
            hasContactForm: typeof features.hasContactForm === "boolean" ? features.hasContactForm : null,
            https: typeof metrics.https === "boolean" ? metrics.https : null,
          }
        : null,
    score: input.latestScore
      ? {
          totalScore: input.latestScore.totalScore,
          band: input.latestScore.band,
          factors: input.latestScore.factors.map((f) => ({ code: f.factorCode, points: f.points })),
        }
      : null,
  };
}
