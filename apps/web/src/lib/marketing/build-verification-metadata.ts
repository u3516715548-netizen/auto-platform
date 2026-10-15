import type { Metadata } from "next";
import type { PublicMarketingRuntimeView } from "@auto-platform/types";

/**
 * Search Console / Bing / Meta / Pinterest verification meta for public homepage.
 * Safe tokens only (already sanitized at upsert).
 */
export function buildVerificationMetadata(
  marketing: PublicMarketingRuntimeView | undefined,
): Pick<Metadata, "verification"> | undefined {
  if (!marketing) return undefined;
  const { verification } = marketing;
  const other: Record<string, string | number | (string | number)[]> = {};
  if (verification.bing) other["msvalidate.01"] = verification.bing;
  if (verification.metaDomain) other["facebook-domain-verification"] = verification.metaDomain;
  if (verification.pinterest) other["p:domain_verify"] = verification.pinterest;

  if (!verification.google && Object.keys(other).length === 0) {
    return undefined;
  }

  return {
    verification: {
      ...(verification.google ? { google: verification.google } : {}),
      ...(Object.keys(other).length > 0 ? { other } : {}),
    },
  };
}
