import type { LeadDetail } from "./leads";
import { apiFetch } from "./client";

export interface CrmActivity {
  id: string;
  activityType: string;
  summary: string;
  occurredAt: string;
  nextActionAt: string | null;
}

export interface Member {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

export interface UpdateCrmInput {
  stage?: string;
  assignedUserId?: string;
  nextActionAt?: string;
  note?: string;
}

export const CRM_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

export function updateCrm(leadId: string, input: UpdateCrmInput, version: number): Promise<LeadDetail> {
  return apiFetch(`/leads/${leadId}/crm`, { method: "PATCH", body: input, ifMatch: version });
}

export function listActivities(leadId: string): Promise<CrmActivity[]> {
  return apiFetch(`/leads/${leadId}/activities`);
}

export function listMembers(): Promise<{ items: Member[] }> {
  return apiFetch("/members");
}

export function funnelReport(): Promise<{ stages: Array<{ stage: string; count: number }> }> {
  return apiFetch("/reports/funnel");
}
