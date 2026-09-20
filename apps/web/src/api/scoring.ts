import { apiFetch } from "./client";

export interface ScoreFactor {
  code: string;
  points: number;
  evidence: Record<string, unknown>;
}

export interface LeadScoreDetail {
  leadId: string;
  policyVersion: string;
  rawScore: number;
  totalScore: number;
  band: string;
  eligibleForOutreach: boolean;
  factors: ScoreFactor[];
  calculatedAt: string;
}

export function getLatestScore(leadId: string): Promise<LeadScoreDetail> {
  return apiFetch(`/leads/${leadId}/score`);
}

export function recalculateScore(leadId: string): Promise<LeadScoreDetail> {
  return apiFetch(`/leads/${leadId}/score-calculations`, { method: "POST" });
}
