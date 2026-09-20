import { buildEvidenceSnapshot } from "./evidence-snapshot";

describe("buildEvidenceSnapshot", () => {
  it("omits audit evidence when the latest audit did not complete", () => {
    const snapshot = buildEvidenceSnapshot({
      lead: { tradeName: "X", legalName: "X Ltda", category: "Y", city: "Z", rating: null, reviewCount: null, websiteStatus: "HAS_WEBSITE" },
      latestAudit: { status: "FAILED", performanceScore: null, accessibilityScore: null, seoScore: null, bestPracticesScore: null, featuresDetected: null, technicalMetrics: null },
      latestScore: null,
    });
    expect(snapshot.audit).toBeNull();
  });

  it("never includes contact fields like phone or whatsapp — only curated business/technical signals", () => {
    const snapshot = buildEvidenceSnapshot({
      lead: { tradeName: "X", legalName: "X Ltda", category: "Y", city: "Z", rating: 4, reviewCount: 10, websiteStatus: "HAS_WEBSITE" },
      latestAudit: {
        status: "COMPLETED",
        performanceScore: 80,
        accessibilityScore: 80,
        seoScore: 80,
        bestPracticesScore: 80,
        featuresDetected: { mobileFriendly: true, hasWhatsAppCta: true },
        technicalMetrics: { https: true },
      },
      latestScore: { totalScore: 10, band: "LOW", factors: [{ factorCode: "X", points: 10 }] },
    });
    const sensitiveKeys = ["phone", "whatsapp", "email", "contacts", "contact"];
    expect(Object.keys(snapshot.lead)).toEqual(expect.not.arrayContaining(sensitiveKeys));
    expect(Object.keys(snapshot.audit ?? {})).toEqual(expect.not.arrayContaining(sensitiveKeys));
    expect(snapshot.audit?.mobileFriendly).toBe(true);
  });

  it("falls back to legalName when tradeName is absent", () => {
    const snapshot = buildEvidenceSnapshot({
      lead: { tradeName: null, legalName: "Legal Name Ltda", category: "Y", city: "Z", rating: null, reviewCount: null, websiteStatus: "NO_WEBSITE" },
      latestAudit: null,
      latestScore: null,
    });
    expect(snapshot.lead.tradeName).toBe("Legal Name Ltda");
  });
});
