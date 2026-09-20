// Implementação executável da política descrita em docs/DOCUMENTATION.md seção 3.3.
// Uma política vigente NUNCA é editada — mudar um ponto ou limiar aqui é criar
// uma nova versão (novo arquivo, nova constante POLICY_VERSION, nova linha em
// score_policies), preservando a reprodutibilidade dos scores já calculados.
export const POLICY_VERSION = "2026-09-v1";

export interface LatestAuditEvidence {
  id: string;
  status: string;
  performanceScore: number | null;
  seoScore: number | null;
  featuresDetected: Record<string, unknown> | null;
  technicalMetrics: Record<string, unknown> | null;
  failureReason: string | null;
}

export interface ScoringInput {
  websiteStatus: string;
  rating: number | null;
  reviewCount: number | null;
  latestAudit: LatestAuditEvidence | null;
}

export interface ScoreFactorResult {
  code: string;
  points: number;
  evidence: Record<string, unknown>;
}

export function evaluate(input: ScoringInput): ScoreFactorResult[] {
  const factors: ScoreFactorResult[] = [];

  if (input.websiteStatus === "NO_WEBSITE") {
    factors.push({ code: "NO_WEBSITE", points: 40, evidence: { websiteStatus: input.websiteStatus } });
  } else if (input.websiteStatus === "SOCIAL_ONLY") {
    factors.push({ code: "SOCIAL_ONLY", points: 20, evidence: { websiteStatus: input.websiteStatus } });
  }

  if (input.rating != null && input.rating >= 4.5 && (input.reviewCount ?? 0) >= 20) {
    factors.push({
      code: "RATING_HIGH",
      points: 10,
      evidence: { rating: input.rating, reviewCount: input.reviewCount },
    });
  }
  if ((input.reviewCount ?? 0) >= 100) {
    factors.push({ code: "REVIEWS_HIGH", points: 10, evidence: { reviewCount: input.reviewCount } });
  }
  if (input.rating == null && (input.reviewCount ?? 0) < 5) {
    factors.push({
      code: "LOW_COMMERCIAL_SIGNAL",
      points: -15,
      evidence: { rating: input.rating, reviewCount: input.reviewCount },
    });
  }

  const audit = input.latestAudit;
  if (audit?.status === "COMPLETED") {
    const features = (audit.featuresDetected ?? {}) as Record<string, unknown>;
    const metrics = (audit.technicalMetrics ?? {}) as Record<string, unknown>;

    if (audit.performanceScore != null && audit.performanceScore < 50) {
      factors.push({
        code: "PERFORMANCE_LOW",
        points: 15,
        evidence: { auditId: audit.id, value: audit.performanceScore },
      });
    }
    if (audit.seoScore != null && audit.seoScore < 60) {
      factors.push({ code: "SEO_LOW", points: 10, evidence: { auditId: audit.id, value: audit.seoScore } });
    }
    if (features.hasWhatsAppCta !== true) {
      factors.push({ code: "NO_WHATSAPP_CTA", points: 10, evidence: { auditId: audit.id, detected: false } });
    }
    if (features.mobileFriendly === false) {
      factors.push({
        code: "NOT_MOBILE_FRIENDLY",
        points: 20,
        evidence: { auditId: audit.id, detected: false },
      });
    }
    if (metrics.https === false) {
      factors.push({ code: "NO_HTTPS", points: 20, evidence: { auditId: audit.id, detected: false } });
    }
  } else if (audit?.status === "FAILED") {
    factors.push({
      code: "SITE_UNREACHABLE",
      points: 25,
      evidence: { auditId: audit.id, reason: audit.failureReason ?? undefined },
    });
  }

  return factors;
}

// Faixas da seção 3.3. O total exibido é limitado a 0–100 (rawScore fica sem
// limite para permitir análise/depuração da política).
export function bandFor(score: number): string {
  if (score >= 71) return "PRIORITY";
  if (score >= 51) return "INTERESTING";
  if (score >= 31) return "REVIEW";
  return "LOW";
}
