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
  features: Record<string, unknown>;
  findings: AuditFindingPayload[];
  reportObjectKey: string;
  screenshotObjectKey: string;
}

export interface AuditFailedPayload {
  auditRequestId: string;
  leadId: string;
  reason: string;
}
