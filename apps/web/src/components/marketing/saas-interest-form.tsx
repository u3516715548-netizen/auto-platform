"use client";

import { useState, type FormEvent } from "react";
import { commercialInterestMailtoHref } from "@/lib/marketing/commercial-plans";

type SaasInterestFormProps = {
  className?: string;
};

/**
 * Shopify-like email capture — honest activation request (mailto), not a fake free trial.
 */
export function SaasInterestForm({ className }: SaasInterestFormProps) {
  const [email, setEmail] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    window.location.href = commercialInterestMailtoHref(trimmed);
  }

  return (
    <form
      className={`saas-interest ${className ?? ""}`}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="saas-interest-fields">
        <p className="saas-interest-consent">
          Ești de acord să primești marketing emails.
        </p>
        <label className="sr-only" htmlFor="saas-interest-email">
          Introdu adresa de email
        </label>
        <input
          id="saas-interest-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="Introdu adresa de email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="saas-interest-input"
        />
      </div>
      <button type="submit" className="saas-interest-submit">
        Încearcă gratuit
      </button>
    </form>
  );
}
