import { renderProposalDraft } from "./proposal-template";
import type { DiagnosisOutput } from "./providers/llm-provider.interface";

describe("renderProposalDraft", () => {
  const diagnosis: DiagnosisOutput = {
    summary: "Site com performance mobile ruim, mas boa reputação.",
    strengths: [{ text: "Nota 4,8 em 237 avaliações", evidencePath: "lead.rating" }],
    problems: [{ text: "Performance mobile 31/100", evidencePath: "audit.performance" }],
    opportunities: ["Otimizar carregamento mobile", "Adicionar CTA de WhatsApp"],
    recommendedOffer: "REDESIGN_CONVERSION",
  };

  it("includes the trade name, the summary and every problem and opportunity", () => {
    const draft = renderProposalDraft("Clínica Exemplo", diagnosis);
    expect(draft).toContain("Clínica Exemplo");
    expect(draft).toContain(diagnosis.summary);
    expect(draft).toContain("Performance mobile 31/100");
    expect(draft).toContain("Otimizar carregamento mobile");
    expect(draft).toContain("Adicionar CTA de WhatsApp");
  });

  it("translates the offer code into readable Portuguese", () => {
    const draft = renderProposalDraft("Clínica Exemplo", diagnosis);
    expect(draft).toContain("reestruturação do site com foco em conversão");
  });
});
