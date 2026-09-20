import { apiFetch } from "./client";

export interface DiagnosisItem {
  text: string;
  evidencePath: string;
}

export interface Diagnosis {
  summary: string;
  strengths: DiagnosisItem[];
  problems: DiagnosisItem[];
  opportunities: string[];
  recommendedOffer: string;
}

export interface AiAnalysis {
  id: string;
  status: string;
  reviewStatus: string;
  diagnosis: Diagnosis | null;
  generation: { promptVersion: string | null; modelAlias: string | null; generatedAt: string };
  failureReason: string | null;
}

export interface Proposal {
  id: string;
  leadId: string;
  revision: number;
  status: string;
  content: string;
  approvedAt: string | null;
  createdAt: string;
}

export function listAnalyses(leadId: string): Promise<{ items: AiAnalysis[] }> {
  return apiFetch(`/leads/${leadId}/ai-analyses`);
}

export function requestAnalysis(leadId: string): Promise<{ analysisId: string; status: string; jobId: string }> {
  return apiFetch(`/leads/${leadId}/ai-analyses`, {
    method: "POST",
    body: {
      kind: "COMMERCIAL_DIAGNOSIS",
      language: "pt-BR",
      tone: "DIRECT_AND_PROFESSIONAL",
      evidenceScope: "LATEST_VERIFIED_ONLY",
    },
  });
}

export function getAnalysis(leadId: string, analysisId: string): Promise<AiAnalysis> {
  return apiFetch(`/leads/${leadId}/ai-analyses/${analysisId}`);
}

export function listProposals(leadId: string): Promise<Proposal[]> {
  return apiFetch(`/leads/${leadId}/proposals`);
}

export function generateProposal(leadId: string): Promise<Proposal> {
  return apiFetch(`/leads/${leadId}/proposals`, { method: "POST" });
}

export function decideProposal(proposalId: string, decision: "APPROVED" | "REJECTED"): Promise<Proposal> {
  return apiFetch(`/proposals/${proposalId}/approval`, { method: "POST", body: { decision } });
}
