"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button, Label } from "@auto-platform/ui";
import {
  createPublicLeadAction,
  type CreatePublicLeadState,
} from "@/lib/storefront/create-public-lead";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  LEAD_FORM_COPY,
  LEAD_FORM_HEADING_ID,
} from "@/lib/storefront/lead-form-ui";

const initialState: CreatePublicLeadState = { error: null, success: false };

const fieldClassName =
  "min-h-11 w-full rounded-[var(--sf-radius)] border border-[var(--sf-border)] bg-white px-3 py-2.5 text-base text-[var(--sf-text)] outline-none transition-colors placeholder:text-[var(--sf-text-muted)] focus:border-[var(--sf-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-accent)_25%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--sf-bg)] disabled:text-[var(--sf-text-muted)]";

type PublicLeadFormProps = {
  vehicleSlug: string;
  accent?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
};

export function PublicLeadForm({
  vehicleSlug,
  accent,
  disabled = false,
  disabledMessage,
}: PublicLeadFormProps) {
  const boundAction = createPublicLeadAction.bind(null, vehicleSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [consent, setConsent] = useState(false);
  const color = accent ?? "var(--sf-accent)";
  const hintId = useId();
  const privacyId = useId();
  const consentId = useId();
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.success || state?.error) {
      statusRef.current?.focus({ preventScroll: true });
    }
  }, [state?.success, state?.error]);

  if (disabled) {
    return (
      <div className="flex flex-col gap-3">
        <h2
          id={LEAD_FORM_HEADING_ID}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight text-[var(--sf-text)] outline-none sm:text-xl"
        >
          {LEAD_FORM_COPY.heading}
        </h2>
        <FeedbackBanner variant="info">
          {disabledMessage ?? "Contactul online nu este disponibil momentan pentru acest dealer."}
        </FeedbackBanner>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="flex flex-col gap-3">
        <h2
          id={LEAD_FORM_HEADING_ID}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight text-[var(--sf-text)] outline-none sm:text-xl"
        >
          {LEAD_FORM_COPY.heading}
        </h2>
        <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="polite">
          <FeedbackBanner variant="success">{LEAD_FORM_COPY.success}</FeedbackBanner>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h2
          id={LEAD_FORM_HEADING_ID}
          tabIndex={-1}
          className="text-lg font-semibold tracking-tight text-[var(--sf-text)] outline-none sm:text-xl"
        >
          {LEAD_FORM_COPY.heading}
        </h2>
        <p className="text-sm leading-6 text-[var(--sf-text-muted)]">{LEAD_FORM_COPY.intro}</p>
      </header>

      <form
        action={formAction}
        className="flex min-w-0 flex-col gap-4"
        aria-describedby={`${hintId} ${privacyId}`}
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{LEAD_FORM_COPY.nameLabel}</Label>
          <input
            id="name"
            name="name"
            required
            disabled={pending}
            autoComplete="name"
            placeholder={LEAD_FORM_COPY.namePlaceholder}
            className={fieldClassName}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{LEAD_FORM_COPY.emailLabel}</Label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              required
              disabled={pending}
              autoComplete="email"
              placeholder={LEAD_FORM_COPY.emailPlaceholder}
              aria-describedby={hintId}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">{LEAD_FORM_COPY.phoneLabel}</Label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              disabled={pending}
              autoComplete="tel"
              placeholder={LEAD_FORM_COPY.phonePlaceholder}
              aria-describedby={hintId}
              className={fieldClassName}
            />
          </div>
        </div>

        <p id={hintId} className="text-sm font-medium text-[var(--sf-text)]">
          {LEAD_FORM_COPY.contactHint}
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="message">{LEAD_FORM_COPY.messageLabel}</Label>
          <textarea
            id="message"
            name="message"
            rows={4}
            disabled={pending}
            placeholder={LEAD_FORM_COPY.messagePlaceholder}
            className={`${fieldClassName} min-h-24 resize-y`}
          />
        </div>

        <label htmlFor={consentId} className="flex items-start gap-3 text-sm leading-5 text-[var(--sf-text)]">
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            value="true"
            required
            checked={consent}
            disabled={pending}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-[var(--sf-border)] accent-[var(--sf-accent)]"
          />
          <span>
            {LEAD_FORM_COPY.consent}{" "}
            <span id={privacyId} className="text-[var(--sf-text-muted)]">
              {LEAD_FORM_COPY.privacy}
            </span>
          </span>
        </label>

        {/* Honeypot — CSS-hidden, not type=hidden; keep name="company" */}
        <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {state?.error ? (
          <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="assertive">
            <FeedbackBanner variant="error">{state.error}</FeedbackBanner>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pb-2 sm:pb-0">
          <Button
            type="submit"
            disabled={pending || !consent}
            className="min-h-11 w-full sm:w-auto"
            style={{ backgroundColor: color }}
          >
            {pending ? LEAD_FORM_COPY.submitting : LEAD_FORM_COPY.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
