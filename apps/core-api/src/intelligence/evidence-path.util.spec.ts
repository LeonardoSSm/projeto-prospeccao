import { evidencePathExists } from "./evidence-path.util";

describe("evidencePathExists", () => {
  const snapshot = { lead: { rating: 4.8 }, audit: { performance: 31 }, score: null };

  it("confirms a nested path that really exists", () => {
    expect(evidencePathExists(snapshot, "lead.rating")).toBe(true);
    expect(evidencePathExists(snapshot, "audit.performance")).toBe(true);
  });

  it("rejects a path that does not exist", () => {
    expect(evidencePathExists(snapshot, "lead.whatsapp")).toBe(false);
    expect(evidencePathExists(snapshot, "audit.nonexistent")).toBe(false);
  });

  it("rejects a path that traverses through null", () => {
    expect(evidencePathExists(snapshot, "score.band")).toBe(false);
  });

  it("rejects an empty or malformed path", () => {
    expect(evidencePathExists(snapshot, "")).toBe(false);
  });
});
