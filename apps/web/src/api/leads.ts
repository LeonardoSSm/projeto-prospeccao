import { apiFetch } from "./client";

export interface LeadListItem {
  id: string;
  tradeName: string;
  category: string;
  city: string;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  websiteStatus: string;
  currentScore: number | null;
  scoreBand: string | null;
  crmStage: string;
  nextActionAt: string | null;
  updatedAt: string;
}

export interface LeadContact {
  id: string;
  type: string;
  value: string;
  normalizedValue: string;
  primaryContact: boolean;
}

export interface LeadDetail extends LeadListItem {
  legalName: string;
  addressLine: string | null;
  state: string | null;
  country: string | null;
  assignedUserId: string | null;
  dataQualityStatus: string;
  version: number;
  contacts: LeadContact[];
}

export interface ListLeadsFilters {
  city?: string;
  category?: string;
  websiteStatus?: string[];
  scoreBand?: string[];
  sort?: string;
  limit?: number;
  cursor?: string;
}

export interface ListLeadsResult {
  items: LeadListItem[];
  page: { nextCursor: string | null; hasMore: boolean; limit: number };
}

export function listLeads(filters: ListLeadsFilters): Promise<ListLeadsResult> {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.category) params.set("category", filters.category);
  if (filters.websiteStatus?.length) params.set("websiteStatus", filters.websiteStatus.join(","));
  if (filters.scoreBand?.length) params.set("scoreBand", filters.scoreBand.join(","));
  params.set("sort", filters.sort ?? "-currentScore");
  params.set("limit", String(filters.limit ?? 25));
  if (filters.cursor) params.set("cursor", filters.cursor);
  return apiFetch(`/leads?${params.toString()}`);
}

export function getLead(id: string): Promise<LeadDetail> {
  return apiFetch(`/leads/${id}`);
}

export interface UpdateLeadInput {
  legalName?: string;
  tradeName?: string;
  category?: string;
  city?: string;
  dataQualityStatus?: string;
}

export function updateLead(id: string, input: UpdateLeadInput, version: number): Promise<LeadDetail> {
  return apiFetch(`/leads/${id}`, { method: "PATCH", body: input, ifMatch: version });
}
