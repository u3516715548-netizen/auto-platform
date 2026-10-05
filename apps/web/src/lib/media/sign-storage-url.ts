import { createStaffSupabaseClient, createStorageAdminClient } from "@/lib/supabase/storage-server";
import { MEDIA_BUCKET, VEHICLE_MEDIA_SIGNED_URL_TTL_SEC } from "./constants";

/** Safe Storage error text for UI/logs — never includes secrets. */
export function formatStorageError(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const message =
    "message" in error && typeof error.message === "string" ? error.message.trim() : "";
  const status =
    "status" in error && typeof error.status === "number" ? error.status : null;
  if (!message) return fallback;
  const safe = message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 200);
  return status != null ? `${safe} (${status})` : safe;
}

/**
 * Server-only signed download URL from a DB storage_path.
 * Uses Storage admin client (service role never sent to browser) after app-level gates.
 * Staff JWT alone often fails Storage SELECT RLS for createSignedUrl.
 */
export async function createSignedDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const map = await createSignedDownloadUrls([storagePath]);
  return map.get(storagePath) ?? null;
}

/**
 * Batch signed download URLs for DB storage paths.
 * Missing/failed paths map to null — callers must not block the whole gallery.
 */
export async function createSignedDownloadUrls(
  storagePaths: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const unique = [...new Set(storagePaths.filter((p) => typeof p === "string" && p.length > 0))];
  for (const path of unique) result.set(path, null);
  if (unique.length === 0) return result;

  const admin = createStorageAdminClient();
  if (!admin) {
    console.error("[media] createSignedDownloadUrls: missing SUPABASE_SERVICE_ROLE_KEY");
    return result;
  }

  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(unique, VEHICLE_MEDIA_SIGNED_URL_TTL_SEC);

  if (error || !data) {
    console.error("[media] createSignedUrls failed", {
      bucket: MEDIA_BUCKET,
      count: unique.length,
      message: error?.message,
    });
    return result;
  }

  for (const item of data) {
    if (!item.path) continue;
    if (item.error || !item.signedUrl) {
      result.set(item.path, null);
      continue;
    }
    result.set(item.path, item.signedUrl);
  }

  return result;
}

export type SignedUploadResult =
  | { ok: true; signedUrl: string; token: string }
  | { ok: false; error: string };

/**
 * Mints a path-scoped signed upload URL.
 * Uses the server Storage admin client after app-level membership/vehicle checks.
 */
export async function createSignedUploadUrl(
  storagePath: string,
): Promise<SignedUploadResult> {
  const admin = createStorageAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Semnarea uploadului necesită SUPABASE_SERVICE_ROLE_KEY pe server (fără expunere în browser).",
    };
  }

  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error) {
    console.error("[media] createSignedUploadUrl failed", {
      bucket: MEDIA_BUCKET,
      pathShape: storagePath.split("/").length,
      message: error.message,
      status: "status" in error ? error.status : undefined,
    });
    return {
      ok: false,
      error: formatStorageError(error, "Nu s-a putut genera URL-ul de încărcare."),
    };
  }

  if (!data?.signedUrl || !data?.token) {
    return {
      ok: false,
      error: "Răspuns Storage incomplet la generarea URL-ului de încărcare.",
    };
  }

  return { signedUrl: data.signedUrl, token: data.token, ok: true };
}

export async function removeStorageObject(storagePath: string): Promise<boolean> {
  const admin = createStorageAdminClient();
  const client = admin ?? (await createStaffSupabaseClient());
  const { error } = await client.storage.from(MEDIA_BUCKET).remove([storagePath]);
  return !error;
}

export async function downloadStorageHead(
  storagePath: string,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const admin = createStorageAdminClient();
  const client = admin ?? (await createStaffSupabaseClient());
  const { data, error } = await client.storage.from(MEDIA_BUCKET).download(storagePath);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  if (buf.byteLength > maxBytes) return null;
  return buf.slice(0, Math.min(buf.byteLength, 512));
}
