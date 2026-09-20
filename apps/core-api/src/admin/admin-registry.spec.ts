import { ADMIN_MODELS, getAdminModel } from "./admin-registry";

describe("admin-registry", () => {
  it("throws for a model key that isn't registered", () => {
    expect(() => getAdminModel("notAThing")).toThrow(/não está registrado/);
  });

  it("returns the entry for a known key", () => {
    expect(getAdminModel("lead").label).toBe("Leads");
  });

  it("marks AuditLog as read-only, since a mutable security audit trail defeats its own purpose", () => {
    expect(getAdminModel("auditLog").readOnly).toBe(true);
  });

  it("scopes a directly-owned model by its own organizationId", () => {
    expect(getAdminModel("lead").scopeFilter?.("org-1")).toEqual({ organizationId: "org-1" });
  });

  // Regressão do tipo de bug real que este registro existe pra evitar: um
  // model sem organizationId próprio (CampaignRun só tem campaignId) precisa
  // ser filtrado pela cadeia de relação até o tenant dono, não deixado sem
  // filtro algum.
  it("scopes a model without its own organizationId through its relation chain", () => {
    expect(getAdminModel("campaignRun").scopeFilter?.("org-1")).toEqual({
      campaign: { organizationId: "org-1" },
    });
    expect(getAdminModel("auditFinding").scopeFilter?.("org-1")).toEqual({
      audit: { snapshot: { lead: { organizationId: "org-1" } } },
    });
  });

  it("leaves global catalogs (no scopeFilter) visible to any organization's admin", () => {
    expect(getAdminModel("cnpjEstablishment").scopeFilter).toBeUndefined();
    expect(getAdminModel("scorePolicy").scopeFilter).toBeUndefined();
  });

  it("every registered model has a unique key", () => {
    const keys = ADMIN_MODELS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
