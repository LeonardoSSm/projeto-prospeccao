import { describe, expect, it } from "vitest";
import { extractInstagramHandle, extractWhatsAppNumber } from "./contact-extraction";

describe("extractWhatsAppNumber", () => {
  it("extracts the number from a wa.me link", () => {
    expect(extractWhatsAppNumber("https://wa.me/5585999998888")).toBe("5585999998888");
  });

  it("extracts the number from an api.whatsapp.com link", () => {
    expect(extractWhatsAppNumber("https://api.whatsapp.com/send?phone=5585999998888&text=oi")).toBe(
      "5585999998888",
    );
  });

  it("returns null when there is no href", () => {
    expect(extractWhatsAppNumber(null)).toBeNull();
    expect(extractWhatsAppNumber(undefined)).toBeNull();
  });

  it("returns null when the href doesn't match either pattern", () => {
    expect(extractWhatsAppNumber("https://example.com/contato")).toBeNull();
  });
});

describe("extractInstagramHandle", () => {
  it("extracts the handle from a profile link", () => {
    expect(extractInstagramHandle("https://instagram.com/clinica.sorriso")).toBe("clinica.sorriso");
  });

  it("extracts the handle with a trailing slash", () => {
    expect(extractInstagramHandle("https://www.instagram.com/clinica_sorriso/")).toBe("clinica_sorriso");
  });

  it("ignores post/reel links, which aren't a profile handle", () => {
    expect(extractInstagramHandle("https://instagram.com/p/Cabc123XYZ/")).toBeNull();
    expect(extractInstagramHandle("https://instagram.com/reel/Cabc123XYZ/")).toBeNull();
  });

  it("returns null when there is no href", () => {
    expect(extractInstagramHandle(null)).toBeNull();
  });
});
