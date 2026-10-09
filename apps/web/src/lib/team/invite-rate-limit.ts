import {
  createInMemoryPublicLeadRateLimitBackend,
  type PublicLeadRateLimitBackend,
} from "@/lib/leads/public-lead-rate-limit";

export const INVITE_CREATE_ENDPOINT = "team.createInvitation" as const;
export const INVITE_ACCEPT_ENDPOINT = "team.acceptInvitation" as const;
export const INVITE_RESEND_ENDPOINT = "team.resendInvitation" as const;

let backend: PublicLeadRateLimitBackend | null = null;

export function getInviteRateLimitBackend(): PublicLeadRateLimitBackend {
  if (!backend) {
    backend = createInMemoryPublicLeadRateLimitBackend();
  }
  return backend;
}
