import { buildGeocodeQuery } from "./geocode-query";

describe("buildGeocodeQuery", () => {
  it("joins address, city, state and country", () => {
    expect(
      buildGeocodeQuery({ addressLine: "Rua A, 123", city: "Fortaleza", state: "CE", country: "BR" }),
    ).toBe("Rua A, 123, Fortaleza, CE, BR");
  });

  it("defaults country to Brasil when omitted", () => {
    expect(buildGeocodeQuery({ addressLine: "Rua A, 123", city: "Fortaleza", state: "CE" })).toBe(
      "Rua A, 123, Fortaleza, CE, Brasil",
    );
  });

  it("omits missing parts instead of leaving empty segments", () => {
    expect(buildGeocodeQuery({ addressLine: null, city: "Fortaleza", state: null, country: null })).toBe(
      "Fortaleza, Brasil",
    );
  });

  it("falls back to just the country default when nothing else is usable", () => {
    expect(buildGeocodeQuery({ addressLine: null, city: "", state: null, country: null })).toBe("Brasil");
  });
});
