"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { DashboardVehicleMediaItem } from "@/lib/media/list-vehicle-media";
import {
  confirmVehicleMediaUploadAction,
  deleteVehicleMediaAction,
  reorderVehicleMediaAction,
  requestVehicleMediaUploadAction,
  setVehicleMediaCoverAction,
  updateVehicleMediaAltTextAction,
} from "@/lib/media/media-actions";
import { VEHICLE_MEDIA_MAX_BYTES, VEHICLE_MEDIA_MAX_IMAGES } from "@auto-platform/types";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const ACCEPT = "image/jpeg,image/png,image/webp";

type VehicleGalleryManagerProps = {
  vehicleId: string;
  initialItems: DashboardVehicleMediaItem[];
  readOnly: boolean;
};

export function VehicleGalleryManager({
  vehicleId,
  initialItems,
  readOnly,
}: VehicleGalleryManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Record<string, true>>({});

  const sorted = useMemo(
    () => [...initialItems].sort((a, b) => a.sortOrder - b.sortOrder),
    [initialItems],
  );

  async function handleFiles(fileList: FileList | null) {
    if (readOnly || !fileList?.length) return;
    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        if (sorted.length >= VEHICLE_MEDIA_MAX_IMAGES) {
          setError(`Maxim ${VEHICLE_MEDIA_MAX_IMAGES} imagini per vehicul.`);
          break;
        }
        if (file.size > VEHICLE_MEDIA_MAX_BYTES) {
          setError("Fișierul depășește 5 MB.");
          continue;
        }
        if (!ACCEPT.split(",").includes(file.type)) {
          setError("Format acceptat: JPEG, PNG sau WebP.");
          continue;
        }

        const requestForm = new FormData();
        requestForm.set("vehicleId", vehicleId);
        requestForm.set("contentType", file.type);
        requestForm.set("byteSize", String(file.size));

        const mint = await requestVehicleMediaUploadAction(requestForm);
        if (!mint.ok) {
          setError(mint.error);
          break;
        }

        const uploadRes = await fetch(mint.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          setError("Încărcarea în storage a eșuat.");
          break;
        }

        const confirmForm = new FormData();
        confirmForm.set("vehicleId", vehicleId);
        confirmForm.set("mediaId", mint.mediaId);
        const confirmed = await confirmVehicleMediaUploadAction(confirmForm);
        if (!confirmed.ok) {
          setError(confirmed.error);
          break;
        }
      }
    } finally {
      setUploading(false);
      router.refresh();
    }
  }

  function moveItem(id: string, direction: -1 | 1) {
    if (readOnly) return;
    const order = sorted.map((i) => i.id);
    const idx = order.indexOf(id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    const tmp = next[idx];
    next[idx] = next[target]!;
    next[target] = tmp!;

    startTransition(async () => {
      setError(null);
      const form = new FormData();
      form.set("vehicleId", vehicleId);
      for (const mediaId of next) form.append("orderedMediaIds", mediaId);
      const result = await reorderVehicleMediaAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function setCover(id: string) {
    if (readOnly) return;
    startTransition(async () => {
      setError(null);
      const form = new FormData();
      form.set("vehicleId", vehicleId);
      form.set("mediaId", id);
      const result = await setVehicleMediaCoverAction(form);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (readOnly) return;
    startTransition(async () => {
      setError(null);
      const form = new FormData();
      form.set("vehicleId", vehicleId);
      form.set("mediaId", id);
      const result = await deleteVehicleMediaAction(form);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function saveAlt(id: string, altText: string) {
    if (readOnly) return;
    startTransition(async () => {
      const form = new FormData();
      form.set("vehicleId", vehicleId);
      form.set("mediaId", id);
      form.set("altText", altText);
      const result = await updateVehicleMediaAltTextAction(form);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FeedbackBanner variant="error">{error}</FeedbackBanner> : null}

      {!readOnly ? (
        <label className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 hover:bg-zinc-100">
          <span className="font-medium text-zinc-900">
            {uploading || pending ? "Se procesează…" : "Adaugă imagini"}
          </span>
          <span className="mt-1 text-xs">JPEG, PNG, WebP · max 5 MB · max {VEHICLE_MEDIA_MAX_IMAGES} poze</span>
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            disabled={uploading || pending}
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-600">Nicio imagine încărcată.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                {item.url && !brokenIds[item.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.altText ?? "Imagine vehicul"}
                    className="h-full w-full object-cover"
                    onError={() => setBrokenIds((prev) => ({ ...prev, [item.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-zinc-500">
                    <span>{item.url ? "Preview expirat" : "Preview indisponibil"}</span>
                    <button
                      type="button"
                      className="font-medium text-teal-800 underline-offset-2 hover:underline"
                      onClick={() => {
                        setBrokenIds({});
                        router.refresh();
                      }}
                    >
                      Reîncarcă
                    </button>
                  </div>
                )}
                {item.isCover ? (
                  <span className="absolute top-2 left-2 rounded bg-teal-800 px-2 py-0.5 text-xs font-medium text-white">
                    Principală
                  </span>
                ) : null}
              </div>

              {!readOnly ? (
                <div className="flex flex-wrap gap-1">
                  {!item.isCover ? (
                    <button
                      type="button"
                      className="rounded border border-zinc-200 px-2 py-1 text-xs"
                      disabled={pending}
                      onClick={() => setCover(item.id)}
                    >
                      Setează principală
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                    disabled={pending}
                    onClick={() => moveItem(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-200 px-2 py-1 text-xs"
                    disabled={pending}
                    onClick={() => moveItem(item.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                    disabled={pending}
                    onClick={() => remove(item.id)}
                  >
                    Șterge
                  </button>
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Text alternativ
                <input
                  type="text"
                  defaultValue={item.altText ?? ""}
                  maxLength={160}
                  readOnly={readOnly}
                  className="rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-900"
                  onBlur={(e) => saveAlt(item.id, e.target.value)}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
