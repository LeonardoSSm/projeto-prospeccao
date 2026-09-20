import type { AuditFindingPayload } from "./types";

interface FindingsInput {
  scores: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
  };
  features: {
    mobileFriendly: boolean;
    hasWhatsAppCta: boolean;
    hasContactForm: boolean;
    hasTitle: boolean;
    hasMetaDescription: boolean;
  };
  https: boolean;
}

// Códigos alinhados à tabela de fatores de score (docs/DOCUMENTATION.md seção 3.3) —
// o Scoring (Fase 3) consome exatamente esses códigos, não os números brutos.
export function buildFindings(input: FindingsInput): AuditFindingPayload[] {
  const findings: AuditFindingPayload[] = [];
  const { scores, features, https } = input;

  if (scores.performance !== null && scores.performance < 50) {
    findings.push({
      code: "LOW_MOBILE_PERFORMANCE",
      severity: "HIGH",
      category: "PERFORMANCE",
      evidence: { value: scores.performance },
    });
  }
  if (scores.seo !== null && scores.seo < 60) {
    findings.push({
      code: "SEO_LOW",
      severity: "MEDIUM",
      category: "SEO",
      evidence: { value: scores.seo },
    });
  }
  if (!features.mobileFriendly) {
    findings.push({
      code: "NOT_MOBILE_FRIENDLY",
      severity: "HIGH",
      category: "USABILITY",
      evidence: { detected: false },
    });
  }
  if (!https) {
    findings.push({
      code: "NO_HTTPS",
      severity: "HIGH",
      category: "SECURITY",
      evidence: { detected: false },
    });
  }
  if (!features.hasWhatsAppCta) {
    findings.push({
      code: "NO_WHATSAPP_CTA",
      severity: "MEDIUM",
      category: "CONVERSION",
      evidence: { detected: false },
    });
  }
  if (!features.hasContactForm) {
    findings.push({
      code: "NO_CONTACT_FORM",
      severity: "LOW",
      category: "CONVERSION",
      evidence: { detected: false },
    });
  }
  if (!features.hasMetaDescription) {
    findings.push({
      code: "MISSING_META_DESCRIPTION",
      severity: "LOW",
      category: "SEO",
      evidence: { detected: false },
    });
  }

  return findings;
}
