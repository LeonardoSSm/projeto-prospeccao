import { parseSort } from "./leads.service";

describe("parseSort", () => {
  it("defaults to updatedAt desc when no sort is given", () => {
    expect(parseSort(undefined)).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  // Regressão real encontrada na validação da Fase 3: Postgres trata NULL como
  // "maior que qualquer número" em ORDER BY DESC por padrão, então leads sem
  // score ainda apareciam no topo de um "Top 10" em vez dos de maior pontuação.
  it("pushes leads with a null currentScore to the end even when sorting descending", () => {
    expect(parseSort("-currentScore")).toEqual([
      { currentScore: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
  });

  it("does the same for ascending sort on a nullable field", () => {
    expect(parseSort("rating")).toEqual([{ rating: { sort: "asc", nulls: "last" } }, { id: "desc" }]);
  });

  it("does not apply nulls handling to non-nullable fields", () => {
    expect(parseSort("-updatedAt")).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("ignores fields outside the sortable allowlist", () => {
    expect(parseSort("-legalName")).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });
});
