"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import { InsufficientRoleError, assertTenantAccess } from "@auto-platform/core";
import {
  VEHICLE_MEDIA_MAX_BYTES,
  VEHICLE_MEDIA_MAX_IMAGES,
  confirmVehicleMediaUploadSchema,
  deleteVehicleMediaSchema,
  reorderVehicleMediaSchema,
  requestVehicleMediaUploadSchema,
  updateVehicleMediaAltTextSchema,
} from "@auto-platform/types";
import {
  getDb,
  vehicleMedia,
  withTenantContext,
  writeAuditLog,
} from "@auto-platform/db";
import { buildVehicleMediaStoragePath, parseVehicleMediaStoragePath } from "./storage-path";
import { detectImageMimeFromBytes } from "./image-bytes";
import {
  createSignedUploadUrl,
  downloadStorageHead,
  removeStorageObject,
} from "./sign-storage-url";
import { loadVehicleForMedia, requireStaffMediaMutation } from "./vehicle-media-access";

export type MediaActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type RequestUploadResult =
  | {
      ok: true;
      mediaId: string;
      storagePath: string;
      signedUrl: string;
      token: string;
    }
  | { ok: false; error: string };

function rejectSmuggledFields(formData: FormData): string | null {
  for (const key of [
    "tenant_id",
    "tenantId",
    "storage_path",
    "storagePath",
    "path",
  ]) {
    const v = formData.get(key);
    if (v !== null && String(v).trim() !== "") {
      return "Câmpuri nepermise în formular.";
    }
  }
  return null;
}

export async function requestVehicleMediaUploadAction(
  formData: FormData,
): Promise<RequestUploadResult> {
  const smuggle = rejectSmuggledFields(formData);
  if (smuggle) return { ok: false, error: smuggle };

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite încărcarea imaginilor." };
    }
    throw error;
  }

  const parsed = requestVehicleMediaUploadSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    contentType: formData.get("contentType"),
    byteSize: Number(formData.get("byteSize")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const vehicle = await loadVehicleForMedia(session, parsed.data.vehicleId);
  if (!vehicle) {
    return { ok: false, error: "Vehicul negăsit." };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const existingCount = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    const [row] = await db
      .select({ value: count() })
      .from(vehicleMedia)
      .where(
        and(
          eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
          eq(vehicleMedia.tenantId, tenantId),
        ),
      );
    return Number(row?.value ?? 0);
  });

  if (existingCount >= VEHICLE_MEDIA_MAX_IMAGES) {
    return {
      ok: false,
      error: `Maxim ${VEHICLE_MEDIA_MAX_IMAGES} imagini per vehicul.`,
    };
  }

  const mediaId = randomUUID();
  const storagePath = buildVehicleMediaStoragePath({
    tenantId,
    vehicleId: parsed.data.vehicleId,
    mediaId,
    contentType: parsed.data.contentType,
  });

  const signed = await createSignedUploadUrl(storagePath);
  if (!signed.ok) {
    return {
      ok: false,
      error: `Nu s-a putut genera URL-ul de încărcare: ${signed.error}`,
    };
  }

  return {
    ok: true,
    mediaId,
    storagePath,
    signedUrl: signed.signedUrl,
    token: signed.token,
  };
}

export async function confirmVehicleMediaUploadAction(
  formData: FormData,
): Promise<MediaActionResult> {
  const smuggle = rejectSmuggledFields(formData);
  if (smuggle) return { ok: false, error: smuggle };

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite încărcarea imaginilor." };
    }
    throw error;
  }

  const parsed = confirmVehicleMediaUploadSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    mediaId: formData.get("mediaId"),
    altText: formData.get("altText") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const vehicle = await loadVehicleForMedia(session, parsed.data.vehicleId);
  if (!vehicle) {
    return { ok: false, error: "Vehicul negăsit." };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const rows = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db
      .select({ storagePath: vehicleMedia.storagePath })
      .from(vehicleMedia)
      .where(eq(vehicleMedia.id, parsed.data.mediaId))
      .limit(1);
  });
  if (rows.length > 0) {
    return { ok: false, error: "Imaginea există deja." };
  }

  const existingPaths = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db
      .select({ storagePath: vehicleMedia.storagePath, sortOrder: vehicleMedia.sortOrder })
      .from(vehicleMedia)
      .where(
        and(
          eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
          eq(vehicleMedia.tenantId, tenantId),
        ),
      )
      .orderBy(asc(vehicleMedia.sortOrder));
  });

  if (existingPaths.length >= VEHICLE_MEDIA_MAX_IMAGES) {
    return {
      ok: false,
      error: `Maxim ${VEHICLE_MEDIA_MAX_IMAGES} imagini per vehicul.`,
    };
  }

  let storagePath: string | null = null;
  for (const ext of ["jpg", "png", "webp"] as const) {
    const path = `${tenantId}/${parsed.data.vehicleId}/${parsed.data.mediaId}.${ext}`;
    const head = await downloadStorageHead(path, VEHICLE_MEDIA_MAX_BYTES);
    if (head) {
      storagePath = path;
      const detected = detectImageMimeFromBytes(head);
      if (!detected) {
        await removeStorageObject(path);
        return { ok: false, error: "Fișierul nu este o imagine validă." };
      }
      break;
    }
  }

  if (!storagePath) {
    return { ok: false, error: "Fișierul nu a fost încărcat sau nu a putut fi verificat." };
  }

  const parsedPath = parseVehicleMediaStoragePath(storagePath);
  if (
    !parsedPath ||
    parsedPath.tenantId !== tenantId ||
    parsedPath.vehicleId !== parsed.data.vehicleId ||
    parsedPath.mediaId !== parsed.data.mediaId
  ) {
    await removeStorageObject(storagePath);
    return { ok: false, error: "Cale storage invalidă." };
  }

  const nextSort =
    existingPaths.length === 0
      ? 0
      : Math.max(...existingPaths.map((r) => r.sortOrder)) + 1;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      await db.insert(vehicleMedia).values({
        id: parsed.data.mediaId,
        tenantId,
        vehicleId: parsed.data.vehicleId,
        storagePath,
        type: "image",
        sortOrder: nextSort,
        altText: parsed.data.altText ?? null,
      });

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle_media.create",
        entityType: "vehicle_media",
        entityId: parsed.data.mediaId,
        metadata: { vehicleId: parsed.data.vehicleId },
      });
    });
  } catch {
    await removeStorageObject(storagePath);
    return { ok: false, error: "Nu s-a putut salva imaginea." };
  }

  return { ok: true };
}

export async function deleteVehicleMediaAction(formData: FormData): Promise<MediaActionResult> {
  const smuggle = rejectSmuggledFields(formData);
  if (smuggle) return { ok: false, error: smuggle };

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite ștergerea imaginilor." };
    }
    throw error;
  }

  const parsed = deleteVehicleMediaSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    mediaId: formData.get("mediaId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  const row = await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    return db.query.vehicleMedia.findFirst({
      where: and(
        eq(vehicleMedia.id, parsed.data.mediaId),
        eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
        eq(vehicleMedia.tenantId, tenantId),
      ),
    });
  });

  if (!row) {
    return { ok: false, error: "Imagine negăsită." };
  }
  assertTenantAccess(tenantId, row.tenantId);

  const removed = await removeStorageObject(row.storagePath);
  if (!removed) {
    return { ok: false, error: "Nu s-a putut șterge fișierul din storage." };
  }

  await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
    await db
      .delete(vehicleMedia)
      .where(
        and(
          eq(vehicleMedia.id, parsed.data.mediaId),
          eq(vehicleMedia.tenantId, tenantId),
        ),
      );

    await writeAuditLog(db, {
      tenantId,
      actorProfileId: profileId,
      action: "vehicle_media.delete",
      entityType: "vehicle_media",
      entityId: parsed.data.mediaId,
      metadata: { vehicleId: parsed.data.vehicleId },
    });
  });

  return { ok: true };
}

export async function reorderVehicleMediaAction(formData: FormData): Promise<MediaActionResult> {
  const smuggle = rejectSmuggledFields(formData);
  if (smuggle) return { ok: false, error: smuggle };

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite reordonarea imaginilor." };
    }
    throw error;
  }

  const orderedRaw = formData.getAll("orderedMediaIds");
  const parsed = reorderVehicleMediaSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    orderedMediaIds: orderedRaw.map(String),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ordine invalidă." };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const existing = await db
        .select({ id: vehicleMedia.id })
        .from(vehicleMedia)
        .where(
          and(
            eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
            eq(vehicleMedia.tenantId, tenantId),
          ),
        );

      const existingIds = new Set(existing.map((r) => r.id));
      if (existingIds.size !== parsed.data.orderedMediaIds.length) {
        throw new Error("MISMATCH");
      }
      for (const id of parsed.data.orderedMediaIds) {
        if (!existingIds.has(id)) throw new Error("MISMATCH");
      }

      let order = 0;
      for (const mediaId of parsed.data.orderedMediaIds) {
        await db
          .update(vehicleMedia)
          .set({ sortOrder: order })
          .where(
            and(
              eq(vehicleMedia.id, mediaId),
              eq(vehicleMedia.tenantId, tenantId),
              eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
            ),
          );
        order += 1;
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle_media.reorder",
        entityType: "vehicle",
        entityId: parsed.data.vehicleId,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISMATCH") {
      return { ok: false, error: "Lista de imagini nu corespunde vehiculului." };
    }
    throw error;
  }

  return { ok: true };
}

export async function setVehicleMediaCoverAction(formData: FormData): Promise<MediaActionResult> {
  const mediaId = formData.get("mediaId");
  const vehicleId = formData.get("vehicleId");
  if (typeof mediaId !== "string" || typeof vehicleId !== "string") {
    return { ok: false, error: "Date invalide." };
  }

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite setarea imaginii principale." };
    }
    throw error;
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const rows = await db
        .select({ id: vehicleMedia.id, sortOrder: vehicleMedia.sortOrder })
        .from(vehicleMedia)
        .where(
          and(eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.tenantId, tenantId)),
        )
        .orderBy(asc(vehicleMedia.sortOrder));

      const ids = rows.map((r) => r.id);
      if (!ids.includes(mediaId)) {
        throw new Error("MISMATCH");
      }

      const reordered = [mediaId, ...ids.filter((id) => id !== mediaId)];
      let order = 0;
      for (const id of reordered) {
        await db
          .update(vehicleMedia)
          .set({ sortOrder: order })
          .where(and(eq(vehicleMedia.id, id), eq(vehicleMedia.tenantId, tenantId)));
        order += 1;
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle_media.set_cover",
        entityType: "vehicle_media",
        entityId: mediaId,
        metadata: { vehicleId },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISMATCH") {
      return { ok: false, error: "Imagine negăsită." };
    }
    throw error;
  }

  return { ok: true };
}

export async function updateVehicleMediaAltTextAction(
  formData: FormData,
): Promise<MediaActionResult> {
  const smuggle = rejectSmuggledFields(formData);
  if (smuggle) return { ok: false, error: smuggle };

  let session;
  try {
    session = await requireStaffMediaMutation();
  } catch (error) {
    if (error instanceof InsufficientRoleError) {
      return { ok: false, error: "Rolul tău nu permite editarea textului alternativ." };
    }
    throw error;
  }

  const parsed = updateVehicleMediaAltTextSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    mediaId: formData.get("mediaId"),
    altText: formData.get("altText"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const tenantId = session.tenant.tenantId;
  const profileId = session.user.profile.id;

  try {
    await withTenantContext(getDb(), { profileId, tenantId }, async (db) => {
      const updated = await db
        .update(vehicleMedia)
        .set({ altText: parsed.data.altText })
        .where(
          and(
            eq(vehicleMedia.id, parsed.data.mediaId),
            eq(vehicleMedia.vehicleId, parsed.data.vehicleId),
            eq(vehicleMedia.tenantId, tenantId),
          ),
        )
        .returning({ id: vehicleMedia.id });

      if (updated.length === 0) {
        throw new Error("NOT_FOUND");
      }

      await writeAuditLog(db, {
        tenantId,
        actorProfileId: profileId,
        action: "vehicle_media.update_alt",
        entityType: "vehicle_media",
        entityId: parsed.data.mediaId,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return { ok: false, error: "Imagine negăsită." };
    }
    throw error;
  }

  return { ok: true };
}

