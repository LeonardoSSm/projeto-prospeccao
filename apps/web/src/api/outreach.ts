import { apiFetch } from "./client";

export interface OutreachMessage {
  id: string;
  leadId: string;
  channel: string;
  status: string;
  content: string;
  recipientValue: string;
  rejectedReason: string | null;
  failureReason: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const OUTREACH_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"];

export function listOutreachMessages(leadId: string): Promise<OutreachMessage[]> {
  return apiFetch(`/leads/${leadId}/outreach-messages`);
}

export function createOutreachMessage(
  leadId: string,
  channel: string,
  content: string,
): Promise<OutreachMessage> {
  return apiFetch("/outreach-messages", { method: "POST", body: { leadId, channel, content } });
}

export function decideOutreachMessage(
  messageId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<OutreachMessage> {
  return apiFetch(`/outreach-messages/${messageId}/approval`, { method: "POST", body: { decision } });
}

export function requestOutreachSend(messageId: string): Promise<{ status: string; jobId: string | null }> {
  return apiFetch(`/outreach-messages/${messageId}/send-requests`, { method: "POST" });
}

export function suppressContact(leadId: string, channel: string, reason: string): Promise<{ suppressed: boolean }> {
  return apiFetch(`/leads/${leadId}/suppressions`, { method: "POST", body: { channel, reason } });
}
