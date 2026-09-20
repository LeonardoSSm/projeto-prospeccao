import { coerceValue } from "./admin-coercion";
import type { PrismaFieldMeta } from "./admin-registry";

function field(overrides: Partial<PrismaFieldMeta>): PrismaFieldMeta {
  return {
    name: "field",
    kind: "scalar",
    type: "String",
    isList: false,
    isRequired: false,
    isId: false,
    isUnique: false,
    isReadOnly: false,
    hasDefaultValue: false,
    isUpdatedAt: false,
    ...overrides,
  };
}

describe("coerceValue", () => {
  it("parses a numeric string for Int fields", () => {
    expect(coerceValue(field({ type: "Int" }), "42")).toBe(42);
  });

  it("parses a decimal string for Float/Decimal fields", () => {
    expect(coerceValue(field({ type: "Float" }), "3.5")).toBe(3.5);
    expect(coerceValue(field({ type: "Decimal" }), "18.90")).toBe(18.9);
  });

  it("converts the string 'true'/'false' to a real boolean", () => {
    expect(coerceValue(field({ type: "Boolean" }), "true")).toBe(true);
    expect(coerceValue(field({ type: "Boolean" }), "false")).toBe(false);
  });

  it("parses an ISO string into a Date for DateTime fields", () => {
    const result = coerceValue(field({ type: "DateTime" }), "2026-09-20T10:00:00.000Z");
    expect(result).toBeInstanceOf(Date);
  });

  it("parses a JSON string for Json fields", () => {
    expect(coerceValue(field({ type: "Json" }), '{"a":1}')).toEqual({ a: 1 });
  });

  it("throws for malformed JSON, letting the caller turn it into a 400", () => {
    expect(() => coerceValue(field({ type: "Json" }), "{not json")).toThrow();
  });

  it("passes list fields through untouched (array already built by the caller)", () => {
    expect(coerceValue(field({ isList: true, type: "String" }), ["a", "b"])).toEqual(["a", "b"]);
  });

  it("maps null to undefined on a required field, so the update just skips it", () => {
    expect(coerceValue(field({ isRequired: true }), null)).toBeUndefined();
  });

  it("keeps null as null on an optional field", () => {
    expect(coerceValue(field({ isRequired: false }), null)).toBeNull();
  });

  it("leaves plain strings untouched for the default (String) type", () => {
    expect(coerceValue(field({ type: "String" }), "hello")).toBe("hello");
  });
});
