import type { PrismaFieldMeta } from "./admin-registry";

// Converte o texto/valor cru vindo do PATCH genérico da Central de Dados pro
// tipo que o Prisma espera pra aquele campo — extraído à parte de
// admin.service.ts só pra poder testar sem precisar instanciar PrismaService.
export function coerceValue(field: PrismaFieldMeta, value: unknown): unknown {
  if (value === null) return field.isRequired ? undefined : null;
  if (field.isList) return value;
  switch (field.type) {
    case "Int":
      return typeof value === "string" ? Number.parseInt(value, 10) : value;
    case "Float":
    case "Decimal":
      return typeof value === "string" ? Number.parseFloat(value) : value;
    case "Boolean":
      return typeof value === "string" ? value === "true" : value;
    case "DateTime":
      return typeof value === "string" ? new Date(value) : value;
    case "Json":
      return typeof value === "string" ? JSON.parse(value) : value;
    default:
      return value;
  }
}
