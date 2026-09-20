import { csvRowExternalId, normalizeHeader, toLeadRow } from "./csv-row.mapper";

describe("normalizeHeader", () => {
  it("maps common PT-BR aliases to canonical field names", () => {
    expect(normalizeHeader("Razão Social")).toBe("legalName");
    expect(normalizeHeader("nome_fantasia")).toBe("tradeName");
    expect(normalizeHeader("Cidade")).toBe("city");
    expect(normalizeHeader("Site")).toBe("websiteUrl");
  });

  it("passes through unknown headers unchanged", () => {
    expect(normalizeHeader("campo_desconhecido")).toBe("campo_desconhecido");
  });
});

describe("toLeadRow", () => {
  it("returns null when legalName or city is missing", () => {
    expect(toLeadRow({ legalName: "", city: "Fortaleza" })).toBeNull();
    expect(toLeadRow({ legalName: "Empresa", city: "" })).toBeNull();
  });

  it("maps a complete row and defaults category when absent", () => {
    const row = toLeadRow({ legalName: "Empresa Ltda", city: "Fortaleza", rating: "4.5" });
    expect(row).toMatchObject({ legalName: "Empresa Ltda", city: "Fortaleza", category: "UNSPECIFIED", rating: 4.5 });
  });
});

describe("csvRowExternalId", () => {
  it("is stable for the same legalName/city/phone", () => {
    const row = { legalName: "Empresa", city: "Fortaleza", category: "X" };
    expect(csvRowExternalId(row)).toBe(csvRowExternalId({ ...row }));
  });

  it("differs when the phone changes", () => {
    const a = csvRowExternalId({ legalName: "Empresa", city: "Fortaleza", category: "X", phone: "111" });
    const b = csvRowExternalId({ legalName: "Empresa", city: "Fortaleza", category: "X", phone: "222" });
    expect(a).not.toBe(b);
  });
});
