// Forma do payload publicado pelo audit-worker em `prospector.audit.completed.v1`
// (docs/DOCUMENTATION.md seção 4.10). Mantido em sincronia manualmente com
// apps/audit-worker/src/audit/types.ts até existir geração de tipos a partir de
// JSON Schema compartilhado (seção 7.4 do blueprint).
export interface AuditFindingPayload {
  code: string;
  severity: string;
  category: string;
  evidence: Record<string, unknown>;
}

// whatsappNumber/instagramHandle vêm de contact-extraction.ts (audit-worker) — o
// valor real extraído do href do site, não só a detecção booleana de presença.
// AuditingService.applyCompleted usa isso pra criar LeadContact automaticamente.
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
