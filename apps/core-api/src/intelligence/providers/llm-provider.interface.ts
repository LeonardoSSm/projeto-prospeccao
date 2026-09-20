import type { DiagnosisEvidence } from "../evidence-snapshot";

export interface DiagnosisRequest {
  evidence: DiagnosisEvidence;
  language: string;
  tone: string;
}

export interface DiagnosisOutput {
  summary: string;
  strengths: Array<{ text: string; evidencePath: string }>;
  problems: Array<{ text: string; evidencePath: string }>;
  opportunities: string[];
  recommendedOffer: string;
}

export interface DiagnosisProviderResult {
  modelName: string;
  promptVersion: string;
  output: DiagnosisOutput;
  tokensUsed: number | null;
  latencyMs: number;
  estimatedCostUsd: number | null;
}

// Porta do adaptador de IA (ADR-009: "IA por adaptador e saída estruturada") — um
// provedor real (Anthropic, etc.) e o mock implementam a mesma interface sem que
// o restante do domínio saiba a diferença.
export interface LlmProvider {
  readonly name: string;
  generateDiagnosis(request: DiagnosisRequest): Promise<DiagnosisProviderResult>;
}

export const LLM_PROVIDER = Symbol("LLM_PROVIDER");
