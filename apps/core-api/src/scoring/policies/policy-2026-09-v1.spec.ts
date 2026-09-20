import { bandFor, evaluate } from "./policy-2026-09-v1";

describe("policy-2026-09-v1: evaluate", () => {
  it("scores a lead with no website and no reputation evidence at all", () => {
    // Sem site E sem rating/reviews são dois sinais fracos independentes — é
    // esperado que ambos os fatores apareçam juntos, não um substituindo o outro.
    const factors = evaluate({ websiteStatus: "NO_WEBSITE", rating: null, reviewCount: null, latestAudit: null });
    expect(factors).toEqual(
      expect.arrayContaining([
        { code: "NO_WEBSITE", points: 40, evidence: { websiteStatus: "NO_WEBSITE" } },
        { code: "LOW_COMMERCIAL_SIGNAL", points: -15, evidence: { rating: null, reviewCount: null } },
      ]),
    );
    expect(factors).toHaveLength(2);
  });

  it("combines reputation factors when rating and reviews are strong", () => {
    const factors = evaluate({
      websiteStatus: "HAS_WEBSITE",
      rating: 4.8,
      reviewCount: 237,
      latestAudit: null,
    });
    const codes = factors.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["RATING_HIGH", "REVIEWS_HIGH"]));
  });

  it("flags a poor but reachable site exactly like the documented example", () => {
    // Mesmo cenário do exemplo da seção 4.11 do blueprint: site existe, mas
    // performance/SEO ruins e sem CTA de WhatsApp.
    const factors = evaluate({
      websiteStatus: "HAS_WEBSITE",
      rating: 4.8,
      reviewCount: 237,
      latestAudit: {
        id: "audit-1",
        status: "COMPLETED",
        performanceScore: 31,
        seoScore: 58,
        featuresDetected: { hasWhatsAppCta: false, mobileFriendly: true },
        technicalMetrics: { https: true },
        failureReason: null,
      },
    });

    const total = factors.reduce((sum, f) => sum + f.points, 0);
    expect(total).toBe(55);
    expect(bandFor(total)).toBe("INTERESTING");
    expect(factors.map((f) => f.code)).toEqual(
      expect.arrayContaining(["RATING_HIGH", "REVIEWS_HIGH", "PERFORMANCE_LOW", "SEO_LOW", "NO_WHATSAPP_CTA"]),
    );
  });

  it("flags a persistently unreachable site instead of performance factors", () => {
    const factors = evaluate({
      websiteStatus: "HAS_WEBSITE",
      rating: null,
      reviewCount: null,
      latestAudit: {
        id: "audit-2",
        status: "FAILED",
        performanceScore: null,
        seoScore: null,
        featuresDetected: null,
        technicalMetrics: null,
        failureReason: "Timeout",
      },
    });
    expect(factors).toEqual(
      expect.arrayContaining([
        { code: "SITE_UNREACHABLE", points: 25, evidence: { auditId: "audit-2", reason: "Timeout" } },
      ]),
    );
    expect(factors.map((f) => f.code)).not.toContain("PERFORMANCE_LOW");
  });

  it("applies the low-commercial-signal penalty when there is no reputation evidence", () => {
    const factors = evaluate({ websiteStatus: "HAS_WEBSITE", rating: null, reviewCount: 0, latestAudit: null });
    expect(factors).toContainEqual({
      code: "LOW_COMMERCIAL_SIGNAL",
      points: -15,
      evidence: { rating: null, reviewCount: 0 },
    });
  });
});

describe("bandFor", () => {
  it("maps scores to the documented bands", () => {
    expect(bandFor(0)).toBe("LOW");
    expect(bandFor(30)).toBe("LOW");
    expect(bandFor(31)).toBe("REVIEW");
    expect(bandFor(50)).toBe("REVIEW");
    expect(bandFor(51)).toBe("INTERESTING");
    expect(bandFor(70)).toBe("INTERESTING");
    expect(bandFor(71)).toBe("PRIORITY");
    expect(bandFor(100)).toBe("PRIORITY");
  });
});
