// Mantido em sincronia manual com apps/core-api/src/auditing/audit-results.types.ts
// (ver nota lá sobre JSON Schema compartilhado como evolução futura).
export interface AuditRequestedPayload {
  auditRequestId: string;
  leadId: string;
  url: string;
  profile: "MOBILE" | "DESKTOP";
  timeoutSeconds: number;
}

export interface AuditFindingPayload {
  code: string;
  severity: string;
  category: string;
  evidence: Record<string, unknown>;
}

// whatsappNumber/instagramHandle vêm de contact-extraction.ts — o valor real
// extraído do href, não só a detecção booleana de presença (hasWhatsAppCta).
export interface AuditFeaturesPayload {
  mobileFriendly: boolean;
  hasWhatsAppCta: boolean;
  hasContactForm: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  whatsappNumber: string | null;
  instagramHandle: string | null;
}

export interface AuditCompletedPayload {
  auditRequestId: string;
  leadId: string;
  engineVersion: string;
  finalUrl: string;
  contentHash: string;
  http: {
    status: number;
    https: boolean;
    redirectCount: number;
  };
  lighthouse: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
    metrics: Record<string, unknown>;
  };
  features: AuditFeaturesPayload;
  findings: AuditFindingPayload[];
  reportObjectKey: string;
  screenshotObjectKey: string;
}

export interface AuditFailedPayload {
  auditRequestId: string;
  leadId: string;
  reason: string;
}
