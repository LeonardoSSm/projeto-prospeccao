import { Injectable } from "@nestjs/common";
import { PROMPT_VERSION } from "../prompts/commercial-diagnosis-v3";
import type {
  DiagnosisOutput,
  DiagnosisProviderResult,
  DiagnosisRequest,
  LlmProvider,
} from "./llm-provider.interface";

// Determinístico e sem chamada externa (docs/DOCUMENTATION.md seção 6.5 — mesmo
// espírito do MockPlacesProvider): monta o diagnóstico com regras simples sobre o
// próprio evidence snapshot, sempre citando evidencePath real. Útil para
// desenvolvimento/teste sem depender de uma chave de API.
@Injectable()
export class MockLlmProvider implements LlmProvider {
  readonly name = "MOCK";

  async generateDiagnosis(request: DiagnosisRequest): Promise<DiagnosisProviderResult> {
    const start = Date.now();
    const { lead, audit } = request.evidence;

    const strengths: DiagnosisOutput["strengths"] = [];
    const problems: DiagnosisOutput["problems"] = [];
    const opportunities: string[] = [];

    if (lead.rating != null && lead.rating >= 4.0) {
      strengths.push({ text: `Nota ${lead.rating} entre os clientes`, evidencePath: "lead.rating" });
    }
    if ((lead.reviewCount ?? 0) >= 50) {
      strengths.push({
        text: `Volume relevante de avaliações (${lead.reviewCount})`,
        evidencePath: "lead.reviewCount",
      });
    }

    if (lead.websiteStatus === "NO_WEBSITE") {
      problems.push({ text: "Nenhum site identificado para o negócio", evidencePath: "lead.websiteStatus" });
      opportunities.push("Criar um site institucional com foco em conversão local");
    } else if (lead.websiteStatus === "SOCIAL_ONLY") {
      problems.push({
        text: "Presença digital restrita a redes sociais, sem site próprio",
        evidencePath: "lead.websiteStatus",
      });
      opportunities.push("Migrar a presença digital para um site próprio, sem depender só de redes sociais");
    }

    if (audit) {
      if (audit.performance != null && audit.performance < 50) {
        problems.push({
          text: `Performance mobile baixa (${audit.performance}/100)`,
          evidencePath: "audit.performance",
        });
        opportunities.push("Otimizar carregamento mobile do site");
      }
      if (audit.seo != null && audit.seo < 60) {
        problems.push({ text: `SEO abaixo do recomendado (${audit.seo}/100)`, evidencePath: "audit.seo" });
        opportunities.push("Reestruturar metadados para SEO local");
      }
      if (audit.hasWhatsAppCta === false) {
        problems.push({ text: "Nenhum CTA de WhatsApp detectado no site", evidencePath: "audit.hasWhatsAppCta" });
        opportunities.push("Adicionar conversão direta por WhatsApp");
      }
      if (audit.mobileFriendly === false) {
        problems.push({ text: "Site reprovado no critério mobile-friendly", evidencePath: "audit.mobileFriendly" });
      }
    }

    if (opportunities.length === 0) {
      opportunities.push("Revisão geral de conversão e atualização de conteúdo");
    }

    const recommendedOffer =
      lead.websiteStatus === "NO_WEBSITE" || lead.websiteStatus === "SOCIAL_ONLY"
        ? "NEW_WEBSITE"
        : "REDESIGN_CONVERSION";

    const summary =
      strengths.length > 0
        ? `A empresa demonstra ${strengths[0].text.toLowerCase()}, mas ${problems.length > 0 ? problems[0].text.toLowerCase() : "tem espaço para melhorar a presença digital"}.`
        : `A empresa tem espaço para melhorar sua presença digital${problems.length > 0 ? `: ${problems[0].text.toLowerCase()}` : "."}`;

    const output: DiagnosisOutput = {
      summary,
      strengths,
      problems,
      opportunities,
      recommendedOffer,
    };

    return {
      modelName: "mock-analysis",
      promptVersion: PROMPT_VERSION,
      output,
      tokensUsed: null,
      latencyMs: Date.now() - start,
      estimatedCostUsd: 0,
    };
  }
}
