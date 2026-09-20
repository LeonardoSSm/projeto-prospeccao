import { NormalizationService } from "./normalization.service";

describe("NormalizationService", () => {
  const service = new NormalizationService();

  describe("domain", () => {
    it("extracts and lowercases the hostname from a full URL", () => {
      expect(service.domain("https://www.ClinicaExemplo.com.br/pagina")).toBe("clinicaexemplo.com.br");
    });

    it("adds a scheme when missing so bare domains still parse", () => {
      expect(service.domain("clinicaexemplo.com.br")).toBe("clinicaexemplo.com.br");
    });

    it("returns null for empty or invalid input", () => {
      expect(service.domain(null)).toBeNull();
      expect(service.domain("")).toBeNull();
      expect(service.domain("   ")).toBeNull();
    });
  });

  describe("phone", () => {
    it("prefixes the BR country code onto an 11-digit local number", () => {
      expect(service.phone("(85) 93333-4444")).toBe("+5585933334444");
    });

    it("keeps a number that already has the country code", () => {
      expect(service.phone("5585933334444")).toBe("+5585933334444");
    });

    it("returns null for empty input", () => {
      expect(service.phone(undefined)).toBeNull();
      expect(service.phone("")).toBeNull();
    });
  });

  describe("city", () => {
    it("trims and lowercases", () => {
      expect(service.city("  Fortaleza ")).toBe("fortaleza");
    });
  });

  describe("name", () => {
    it("strips accents and lowercases for comparison", () => {
      expect(service.name("Clínica Odontológica")).toBe("clinica odontologica");
    });
  });
});
