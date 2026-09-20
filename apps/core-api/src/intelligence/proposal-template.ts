import type { DiagnosisOutput } from "./providers/llm-provider.interface";

const OFFER_LABELS: Record<string, string> = {
  NEW_WEBSITE: "criação de um site novo",
  REDESIGN_CONVERSION: "reestruturação do site com foco em conversão",
  SEO_BOOST: "otimização de SEO",
  GENERAL_REVIEW: "revisão geral de presença digital",
};

// Composição por template, não uma nova chamada de IA — o diagnóstico já
// aprovado é a fonte da verdade; a proposta só formata isso como rascunho de
// abordagem (docs/DOCUMENTATION.md seção 1.3, item 10).
export function renderProposalDraft(tradeName: string, diagnosis: DiagnosisOutput): string {
  const offer = OFFER_LABELS[diagnosis.recommendedOffer] ?? diagnosis.recommendedOffer;
  const problemLines = diagnosis.problems.map((p) => `- ${p.text}`).join("\n");
  const opportunityLines = diagnosis.opportunities.map((o) => `- ${o}`).join("\n");

  return `Assunto: Uma oportunidade para o site da ${tradeName}

Olá! Analisamos a presença digital da ${tradeName} e identificamos pontos que podem estar custando clientes hoje:

${problemLines || "- Sem problemas técnicos relevantes identificados."}

${diagnosis.summary}

O que propomos: ${offer}.

Isso destrava:
${opportunityLines}

Podemos conversar 15 minutos esta semana para mostrar exemplos concretos?`;
}
