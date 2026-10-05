/**
 * Public lead form copy + focus anchors (Template 1 / Etapa 10D).
 * No server/action contracts — UI constants only.
 */

export const LEAD_FORM_HEADING_ID = "lead-form-heading" as const;

export const LEAD_FORM_COPY = {
  heading: "Solicită informații despre acest vehicul",
  intro: "Completează formularul și dealerul te va contacta cu detalii despre acest vehicul.",
  contactHint: "Completează cel puțin e-mailul sau telefonul.",
  privacy:
    "Datele tale sunt folosite doar pentru a răspunde solicitării. Nu le publicăm pe site.",
  submit: "Trimite solicitarea",
  submitting: "Se trimite…",
  success: "Solicitarea a fost trimisă. Dealerul te va contacta în curând.",
  nameLabel: "Nume",
  emailLabel: "E-mail",
  phoneLabel: "Telefon",
  messageLabel: "Mesaj",
  namePlaceholder: "ex. Andrei Popescu",
  emailPlaceholder: "ex. andrei@email.ro",
  phonePlaceholder: "ex. 0722 000 000",
  messagePlaceholder: "Spune-ne ce te interesează (opțional)",
} as const;

/**
 * Resolves the element to focus after sticky „Mesaj” scrolls to #contact.
 * Prefers the form heading, then the first interactive field.
 */
export function resolveLeadFormFocusTarget(root: ParentNode): HTMLElement | null {
  const byId = root.querySelector<HTMLElement>(`#${LEAD_FORM_HEADING_ID}`);
  if (byId) return byId;

  const heading = root.querySelector<HTMLElement>("h2, h3");
  if (heading) return heading;

  return root.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([tabindex='-1']), textarea, button:not([disabled])",
  );
}
