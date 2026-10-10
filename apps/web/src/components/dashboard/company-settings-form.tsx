"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import type { CompanyProfileView } from "@auto-platform/types";
import {
  upsertCompanyProfileAction,
  type UpsertCompanyProfileState,
} from "@/lib/settings/upsert-company-profile";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: UpsertCompanyProfileState = { error: null, success: false };

const ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Neselectat" },
  { value: "srl", label: "SRL" },
  { value: "sa", label: "SA" },
  { value: "pfa", label: "PFA" },
  { value: "ii", label: "II" },
  { value: "other", label: "Altă formă" },
];

const DAY_LABELS: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Luni" },
  { key: "tue", label: "Marți" },
  { key: "wed", label: "Miercuri" },
  { key: "thu", label: "Joi" },
  { key: "fri", label: "Vineri" },
  { key: "sat", label: "Sâmbătă" },
  { key: "sun", label: "Duminică" },
];

type CompanySettingsFormProps = {
  profile: CompanyProfileView;
  brandingPhone: string | null;
  brandingWhatsapp: string | null;
};

export function CompanySettingsForm({
  profile,
  brandingPhone,
  brandingWhatsapp,
}: CompanySettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    upsertCompanyProfileAction,
    initialState,
  );

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {state?.error ? (
        <FeedbackBanner variant="error">{state.error}</FeedbackBanner>
      ) : null}
      {state?.success ? (
        <FeedbackBanner variant="success">
          Detaliile firmei au fost salvate.
        </FeedbackBanner>
      ) : null}

      <form action={formAction} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Identitate</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Datele legale și de identificare ale dealerului.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-tradingName">Nume comercial / brand</Label>
            <Input
              id="company-tradingName"
              name="tradingName"
              type="text"
              defaultValue={profile.tradingName ?? ""}
              required
              maxLength={120}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-legalName">Denumire legală</Label>
            <Input
              id="company-legalName"
              name="legalName"
              type="text"
              defaultValue={profile.legalName ?? ""}
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-taxId">CUI / CIF</Label>
            <Input
              id="company-taxId"
              name="taxId"
              type="text"
              defaultValue={profile.taxId ?? ""}
              maxLength={16}
              disabled={pending}
              placeholder="RO12345678"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-registrationNumber">
              Număr Registrul Comerțului
            </Label>
            <Input
              id="company-registrationNumber"
              name="registrationNumber"
              type="text"
              defaultValue={profile.registrationNumber ?? ""}
              maxLength={32}
              disabled={pending}
              placeholder="J40/1234/2020"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-entityType">Formă juridică</Label>
            <select
              id="company-entityType"
              name="entityType"
              defaultValue={profile.entityType ?? ""}
              disabled={pending}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-currency">Monedă</Label>
            <select
              id="company-currency"
              name="currency"
              defaultValue={profile.currency ?? "EUR"}
              disabled={pending}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="EUR">EUR</option>
              <option value="RON">RON</option>
            </select>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Contact</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Date publice de contact. WhatsApp rămâne la{" "}
              <Link
                href="/dashboard/settings/customization/preferences"
                className="font-medium text-teal-800 underline-offset-2 hover:underline"
              >
                Personalizare → Preferințe
              </Link>
              {brandingWhatsapp ? ` (setat: ${brandingWhatsapp})` : ""}.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-publicEmail">Email public</Label>
            <Input
              id="company-publicEmail"
              name="publicEmail"
              type="email"
              defaultValue={profile.publicEmail ?? ""}
              maxLength={160}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-publicPhone">Telefon public</Label>
            <Input
              id="company-publicPhone"
              name="publicPhone"
              type="text"
              defaultValue={profile.publicPhone ?? brandingPhone ?? ""}
              maxLength={40}
              disabled={pending}
              placeholder="+40722123456"
            />
            {brandingPhone && !profile.publicPhone ? (
              <p className="text-xs text-zinc-500">
                Valoare precompletată din branding (Personalizare).
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-website">Website</Label>
            <Input
              id="company-website"
              name="website"
              type="url"
              defaultValue={profile.website ?? ""}
              maxLength={300}
              disabled={pending}
              placeholder="https://exemplu.ro"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Adresă</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Sediu social și, opțional, adresa showroom.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-registeredAddress">Adresă sediu</Label>
            <Input
              id="company-registeredAddress"
              name="registeredAddress"
              type="text"
              defaultValue={profile.registeredAddress ?? ""}
              maxLength={300}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-showroomAddress">Adresă showroom</Label>
            <Input
              id="company-showroomAddress"
              name="showroomAddress"
              type="text"
              defaultValue={profile.showroomAddress ?? ""}
              maxLength={300}
              disabled={pending}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-city">Localitate</Label>
              <Input
                id="company-city"
                name="city"
                type="text"
                defaultValue={profile.city ?? ""}
                maxLength={80}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-county">Județ</Label>
              <Input
                id="company-county"
                name="county"
                type="text"
                defaultValue={profile.county ?? ""}
                maxLength={80}
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-postalCode">Cod poștal</Label>
              <Input
                id="company-postalCode"
                name="postalCode"
                type="text"
                defaultValue={profile.postalCode ?? ""}
                maxLength={16}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-country">Țară (ISO)</Label>
              <Input
                id="company-country"
                name="country"
                type="text"
                defaultValue={profile.country ?? "RO"}
                maxLength={2}
                disabled={pending}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Branding</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Referințe către logo / favicon (cale storage sau URL https). Upload-ul
              fișierelor este amânat.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-logoPath">Logo (cale / URL)</Label>
            <Input
              id="company-logoPath"
              name="logoPath"
              type="text"
              defaultValue={profile.logoPath ?? ""}
              maxLength={500}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-faviconPath">Favicon (cale / URL)</Label>
            <Input
              id="company-faviconPath"
              name="faviconPath"
              type="text"
              defaultValue={profile.faviconPath ?? ""}
              maxLength={500}
              disabled={pending}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Program</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Ore HH:MM pe zi. Lasă gol sau bifează „Închis” pentru zile fără program.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {DAY_LABELS.map(({ key, label }) => {
              const day =
                profile.businessHours?.[
                  key as keyof NonNullable<CompanyProfileView["businessHours"]>
                ];
              const hours =
                day && typeof day === "object" && "open" in day ? day : null;
              const closed = !hours;
              return (
                <div
                  key={key}
                  className="grid grid-cols-[5rem_1fr_1fr_auto] items-end gap-2"
                >
                  <span className="pb-2 text-sm font-medium text-zinc-700">{label}</span>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`hours_${key}_open`} className="sr-only">
                      Deschidere {label}
                    </Label>
                    <Input
                      id={`hours_${key}_open`}
                      name={`hours_${key}_open`}
                      type="text"
                      placeholder="09:00"
                      defaultValue={hours?.open ?? ""}
                      maxLength={5}
                      disabled={pending}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`hours_${key}_close`} className="sr-only">
                      Închidere {label}
                    </Label>
                    <Input
                      id={`hours_${key}_close`}
                      name={`hours_${key}_close`}
                      type="text"
                      placeholder="18:00"
                      defaultValue={hours?.close ?? ""}
                      maxLength={5}
                      disabled={pending}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      name={`hours_${key}_closed`}
                      defaultChecked={closed}
                      disabled={pending}
                    />
                    Închis
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-hoursNote">Notă program</Label>
            <Input
              id="company-hoursNote"
              name="hoursNote"
              type="text"
              defaultValue={profile.businessHours?.note ?? ""}
              maxLength={200}
              disabled={pending}
              placeholder="ex. Închis în sărbători legale"
            />
          </div>
        </section>

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Se salvează…" : "Salvează detaliile firmei"}
          </Button>
        </div>
      </form>
    </div>
  );
}
