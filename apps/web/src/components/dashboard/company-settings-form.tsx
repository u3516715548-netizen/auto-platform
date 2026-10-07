"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@auto-platform/ui";
import {
  updateCompanyNameAction,
  type UpdateCompanyNameState,
} from "@/lib/settings/update-company-name";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const initialState: UpdateCompanyNameState = { error: null, success: false };

type CompanySettingsFormProps = {
  commercialName: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
};

function PendingField({
  id,
  label,
  hint,
}: {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        disabled
        placeholder="Disponibil după migrare"
        className="bg-zinc-50"
      />
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function CompanySettingsForm({
  commercialName,
  publicPhone,
  publicWhatsapp,
}: CompanySettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCompanyNameAction,
    initialState,
  );

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {state?.error ? (
        <FeedbackBanner variant="error">{state.error}</FeedbackBanner>
      ) : null}
      {state?.success ? (
        <FeedbackBanner variant="success">
          Numele comercial a fost salvat.
        </FeedbackBanner>
      ) : null}

      <FeedbackBanner variant="info">
        Doar numele comercial poate fi salvat acum. Celelalte câmpuri așteaptă o migrare de
        schemă — nu sunt stocate în browser și nu apar pe storefront până nu există un DTO
        public explicit.
      </FeedbackBanner>

      <form action={formAction} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Identitate firmă</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Datele legale și de identificare ale dealerului.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-commercialName">Nume comercial</Label>
            <Input
              id="company-commercialName"
              name="commercialName"
              type="text"
              defaultValue={commercialName}
              required
              maxLength={120}
              disabled={pending}
            />
          </div>
          <PendingField id="company-legalName" label="Denumire legală" />
          <PendingField id="company-cui" label="CUI" />
          <PendingField id="company-regCom" label="Număr Registrul Comerțului" />
          <PendingField id="company-hours" label="Program" />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Adresă</h3>
            <p className="mt-1 text-sm text-zinc-600">Sediu / locație showroom.</p>
          </div>
          <PendingField id="company-address" label="Adresă" />
          <PendingField id="company-city" label="Localitate" />
          <PendingField id="company-county" label="Județ" />
          <PendingField id="company-postal" label="Cod poștal" />
          <PendingField id="company-country" label="Țară" />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Contact</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Contactul public actual (telefon / WhatsApp) se editează la{" "}
              <Link
                href="/dashboard/settings/customization"
                className="font-medium text-teal-800 underline-offset-2 hover:underline"
              >
                Personalizare
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-phone">Telefon principal (public)</Label>
            <Input
              id="company-phone"
              type="text"
              value={publicPhone ?? ""}
              readOnly
              disabled
              placeholder="Nesetat"
              className="bg-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-whatsapp">WhatsApp (public)</Label>
            <Input
              id="company-whatsapp"
              type="text"
              value={publicWhatsapp ?? ""}
              readOnly
              disabled
              placeholder="Nesetat"
              className="bg-zinc-50"
            />
          </div>
          <PendingField id="company-phone2" label="Telefon secundar" />
          <PendingField id="company-email" label="Email contact" />
          <PendingField id="company-leadsEmail" label="Email pentru lead-uri" />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Prezență online</h3>
            <p className="mt-1 text-sm text-zinc-600">Linkuri publice ale dealerului.</p>
          </div>
          <PendingField id="company-website" label="Website" />
          <PendingField id="company-facebook" label="Link Facebook" />
          <PendingField id="company-instagram" label="Link Instagram" />
        </section>

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Se salvează…" : "Salvează numele comercial"}
          </Button>
        </div>
      </form>
    </div>
  );
}
