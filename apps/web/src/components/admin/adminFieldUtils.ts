import type { AdminFieldMeta } from "../../api/admin";

// Espelha IMMUTABLE_FIELDS no backend (apps/core-api/src/admin/admin-registry.ts)
// — o PATCH já ignora esses campos silenciosamente, mas a UI nem oferece a
// edição pra não sugerir que mudar "id" ou "organizationId" teria efeito.
const IMMUTABLE_FIELDS = new Set(["id", "organizationId", "createdAt", "updatedAt"]);

export function isEditableField(field: AdminFieldMeta): boolean {
  return !IMMUTABLE_FIELDS.has(field.name) && !field.isUpdatedAt;
}

export function formatCellValue(field: AdminFieldMeta, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field.isList && Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (field.type === "Boolean") return value ? "sim" : "não";
  if (field.type === "DateTime") {
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
  }
  if (field.type === "Json") {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
  return String(value);
}

// Valor pronto pra popular o <input>/<textarea> de edição — diferente de
// formatCellValue, que é só para exibição truncada na tabela.
export function toEditableValue(field: AdminFieldMeta, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.isList && Array.isArray(value)) return value.join(", ");
  if (field.type === "Json") return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (field.type === "DateTime") {
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return "";
    // input[type=datetime-local] espera "YYYY-MM-DDTHH:mm", sem timezone.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return String(value);
}

// Converte o texto do formulário de volta pro shape que o PATCH espera. Listas
// (String[]) viram array separando por vírgula; o resto o backend já sabe
// converter a partir de string (admin.service.ts#coerceValue).
export function fromEditableValue(field: AdminFieldMeta, raw: string): unknown {
  if (raw.trim() === "") return field.isRequired ? undefined : null;
  if (field.isList) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  if (field.type === "Boolean") return raw === "true";
  return raw;
}

export function inputTypeFor(field: AdminFieldMeta): "checkbox" | "number" | "datetime-local" | "textarea" | "text" {
  if (field.isList || field.type === "Json") return "textarea";
  if (field.type === "Boolean") return "checkbox";
  if (field.type === "Int" || field.type === "Float" || field.type === "Decimal") return "number";
  if (field.type === "DateTime") return "datetime-local";
  return "text";
}
