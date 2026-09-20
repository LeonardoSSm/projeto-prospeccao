import { apiFetch } from "./client";

export interface AuditFinding {
  code: string;
  severity: string;
  category: string;
  evidence: Record<string, unknown>;
}

export interface AuditSummary {
  id: string;
  status: string;
  requestedUrl: string;
  finalUrl: string | null;
  capturedAt: string;
  http: { status: number | null; https: boolean | null; redirectCount: number | null };
  lighthouse: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
    metrics: Record<string, unknown>;
  } | null;
  features: Record<string, unknown> | null;
  findings: AuditFinding[];
  failureReason: string | null;
  createdAt: string;
}

export function listAudits(leadId: string): Promise<{ items: AuditSummary[] }> {
  return apiFetch(`/leads/${leadId}/audits`);
}

export function requestAudit(
  leadId: string,
  url: string,
  profile: "MOBILE" | "DESKTOP" = "MOBILE",
): Promise<{ auditRequestId: string; status: string; jobId: string }> {
  return apiFetch(`/leads/${leadId}/audit-requests`, { method: "POST", body: { url, profile } });
}
