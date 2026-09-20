import { evidencePathExists } from "../evidence-path.util";
import type { DiagnosisEvidence } from "../evidence-snapshot";
import { MockLlmProvider } from "./mock-llm.provider";

const provider = new MockLlmProvider();

const baseEvidence: DiagnosisEvidence = {
  lead: { tradeName: "Clínica Exemplo", category: "DENTIST", city: "Fortaleza", rating: 4.8, reviewCount: 237, websiteStatus: "HAS_WEBSITE" },
  audit: {
    performance: 31,
    accessibility: 78,
    seo: 58,
    bestPractices: 64,
    mobileFriendly: true,
    hasWhatsAppCta: false,
    hasContactForm: false,
    https: true,
  },
  score: { totalScore: 55, band: "INTERESTING", factors: [] },
};

describe("MockLlmProvider", () => {
  it("only ever cites evidencePaths that really exist in the input snapshot", async () => {
    const result = await provider.generateDiagnosis({ evidence: baseEvidence, language: "pt-BR", tone: "DIRECT_AND_PROFESSIONAL" });
    for (const item of [...result.output.strengths, ...result.output.problems]) {
      expect(evidencePathExists(baseEvidence, item.evidencePath)).toBe(true);
    }
  });

  it("flags poor performance and missing WhatsApp CTA for a site with real evidence of both", async () => {
    const result = await provider.generateDiagnosis({ evidence: baseEvidence, language: "pt-BR", tone: "DIRECT_AND_PROFESSIONAL" });
    const codes = result.output.problems.map((p) => p.evidencePath);
    expect(codes).toEqual(expect.arrayContaining(["audit.performance", "audit.seo", "audit.hasWhatsAppCta"]));
    expect(result.output.recommendedOffer).toBe("REDESIGN_CONVERSION");
  });

  it("recommends a new website when the lead has none", async () => {
    const evidence: DiagnosisEvidence = {
      ...baseEvidence,
      lead: { ...baseEvidence.lead, websiteStatus: "NO_WEBSITE" },
      audit: null,
    };
    const result = await provider.generateDiagnosis({ evidence, language: "pt-BR", tone: "DIRECT_AND_PROFESSIONAL" });
    expect(result.output.recommendedOffer).toBe("NEW_WEBSITE");
    expect(result.output.problems).toContainEqual(
      expect.objectContaining({ evidencePath: "lead.websiteStatus" }),
    );
  });

  it("always returns at least one opportunity", async () => {
    const evidence: DiagnosisEvidence = {
      lead: { tradeName: "Empresa Boa", category: "X", city: "Y", rating: 5, reviewCount: 500, websiteStatus: "HAS_WEBSITE" },
      audit: { performance: 95, accessibility: 95, seo: 90, bestPractices: 95, mobileFriendly: true, hasWhatsAppCta: true, hasContactForm: true, https: true },
      score: { totalScore: 20, band: "LOW", factors: [] },
    };
    const result = await provider.generateDiagnosis({ evidence, language: "pt-BR", tone: "DIRECT_AND_PROFESSIONAL" });
    expect(result.output.opportunities.length).toBeGreaterThan(0);
  });
});
