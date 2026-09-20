import { apiFetch } from "./client";

export type PrismaScalarType =
  | "String"
  | "Int"
  | "Float"
  | "Boolean"
  | "DateTime"
  | "Json"
  | "Decimal"
  | string;

export interface AdminFieldMeta {
  name: string;
  kind: "scalar" | "object" | "enum" | "unsupported";
  type: PrismaScalarType;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  isUpdatedAt: boolean;
}

export interface AdminModelSummary {
  key: string;
  label: string;
  group: string;
  readOnly: boolean;
  global: boolean;
  searchable: boolean;
  fields: AdminFieldMeta[];
}

export interface AdminListResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export async function listAdminModels(): Promise<AdminModelSummary[]> {
  const result = await apiFetch<{ items: AdminModelSummary[] }>("/admin/models");
  return result.items;
}

export function listAdminRecords(key: string, params: AdminListParams = {}): Promise<AdminListResult> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search) query.set("search", params.search);
  if (params.sortField) query.set("sortField", params.sortField);
  if (params.sortDirection) query.set("sortDirection", params.sortDirection);
  const qs = query.toString();
  return apiFetch(`/admin/models/${key}${qs ? `?${qs}` : ""}`);
}

export function getAdminRecord(key: string, id: string): Promise<Record<string, unknown>> {
  return apiFetch(`/admin/models/${key}/${id}`);
}

export function updateAdminRecord(
  key: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return apiFetch(`/admin/models/${key}/${id}`, { method: "PATCH", body: patch });
}

export function deleteAdminRecord(key: string, id: string): Promise<void> {
  return apiFetch(`/admin/models/${key}/${id}`, { method: "DELETE" });
}
