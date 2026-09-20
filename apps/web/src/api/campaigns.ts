import { apiFetch } from "./client";

export interface Campaign {
  id: string;
  name: string;
  status: string;
  category: string;
  geography: { countryCode: string; stateCode?: string; city: string; radiusKm: number };
  filters: { minimumRating?: number; minimumReviewCount?: number; maximumResults: number };
  providers: string[];
  createdAt: string;
  version: number;
}

export interface CampaignRun {
  id: string;
  campaignId: string;
  status: string;
  counters: { discovered: number; accepted: number; duplicates: number; failed: number };
  startedAt?: string | null;
  finishedAt?: string | null;
  failureReason?: string | null;
}

export interface CreateCampaignInput {
  name: string;
  category: string;
  geography: { countryCode: string; stateCode?: string; city: string; radiusKm: number };
  filters: { minimumRating?: number; minimumReviewCount?: number; maximumResults: number };
  providers: string[];
}

export function listCampaigns(): Promise<{ items: Campaign[] }> {
  return apiFetch("/campaigns");
}

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiFetch("/campaigns", { method: "POST", body: input });
}

export function startCampaignRun(
  campaignId: string,
): Promise<{ run: CampaignRun; job: { id: string; status: string } }> {
  return apiFetch(`/campaigns/${campaignId}/runs`, { method: "POST" });
}

export function getCampaignRun(runId: string): Promise<CampaignRun> {
  return apiFetch(`/campaign-runs/${runId}`);
}
