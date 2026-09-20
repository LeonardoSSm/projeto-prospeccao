import { apiFetch } from "./client";

export interface Niche {
  id: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNicheInput {
  name: string;
  category: string;
  description?: string;
}

export interface UpdateNicheInput {
  name?: string;
  category?: string;
  description?: string;
  active?: boolean;
}

export function listNiches(onlyActive = false): Promise<Niche[]> {
  return apiFetch(`/niches?onlyActive=${onlyActive}`);
}

export function createNiche(input: CreateNicheInput): Promise<Niche> {
  return apiFetch("/niches", { method: "POST", body: input });
}

export function updateNiche(id: string, input: UpdateNicheInput): Promise<Niche> {
  return apiFetch(`/niches/${id}`, { method: "PATCH", body: input });
}

export function deleteNiche(id: string): Promise<void> {
  return apiFetch(`/niches/${id}`, { method: "DELETE" });
}
