import { describe, expect, it } from "vitest";
import { buildFindings } from "./findings";

const goodFeatures = {
  mobileFriendly: true,
  hasWhatsAppCta: true,
  hasContactForm: true,
  hasTitle: true,
  hasMetaDescription: true,
};

describe("buildFindings", () => {
  it("returns no findings for a site that passes every check", () => {
    const findings = buildFindings({
      scores: { performance: 90, accessibility: 90, seo: 90, bestPractices: 90 },
      features: goodFeatures,
      https: true,
    });
    expect(findings).toEqual([]);
  });

  it("flags low performance below the 50 threshold", () => {
    const findings = buildFindings({
      scores: { performance: 31, accessibility: 90, seo: 90, bestPractices: 90 },
      features: goodFeatures,
      https: true,
    });
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "LOW_MOBILE_PERFORMANCE", severity: "HIGH" }),
    );
  });

  it("flags missing HTTPS, WhatsApp CTA and mobile-friendliness together", () => {
    const findings = buildFindings({
      scores: { performance: 90, accessibility: 90, seo: 90, bestPractices: 90 },
      features: { ...goodFeatures, mobileFriendly: false, hasWhatsAppCta: false },
      https: false,
    });
    const codes = findings.map((f) => f.code);
    expect(codes).toEqual(
      expect.arrayContaining(["NOT_MOBILE_FRIENDLY", "NO_HTTPS", "NO_WHATSAPP_CTA"]),
    );
  });
});
