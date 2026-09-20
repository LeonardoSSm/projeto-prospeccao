import { apiFetch } from "./client";

export interface Me {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  organizationId: string;
}

export function getMe(): Promise<Me | null> {
  return apiFetch("/members/me");
}
