# Etapa 9 — Design System + Template 1

**Status:** **FINALIZATĂ local** (9A + 9B + 9C)

## Decizii aprobate

| Decizie | Valoare |
|---------|---------|
| Personalizare vizuală per tenant | doar `primaryColor` |
| Template | registry predefinit; doar `template-1` ready/selectabil |
| Contact public | `phone` + `whatsapp` (E.164 normalizat); fără URL liber |
| Sticky CTA | mobil `md:hidden`; catalog fără Mesaj; detaliu Mesaj dacă `leadsEnabled` |
| Branding update | doar rol **`owner`** (nu există `admin` în enum; RLS `tenants_update_owner`) |
| Fără | logo upload, fonturi/culori secundare per dealer, drag-and-drop, migrare schema |

## 9A — Contract branding + tokens + registry

- Zod: `storefrontTemplateIdSchema`, `publicPhoneSchema`, `publicWhatsappSchema`, `tenantBrandingUpdateSchema`
- `parsePublicBranding` + `PublicTenantView` whitelist
- Registry: `apps/web/src/lib/storefront/templates/registry.ts`
- Tokens CSS pe `.storefront-template-1` (nu pe `:root` / dashboard)

## 9B — Template 1 UI

- Shell marketplace (header/footer)
- Catalog cards + detail hierarchy
- `#contact` pe pagina de detaliu; padding rezervat sticky

## 9C — Sticky + dashboard settings

- [`sticky-contact-bar.tsx`](../../apps/web/src/components/storefront/sticky-contact-bar.tsx) + `resolveStickyContactActions`
- Dashboard [`/dashboard/settings`](../../apps/web/src/app/dashboard/settings/page.tsx)
- `updateTenantBrandingAction` + merge whitelist + audit `tenant.branding.update` (doar `changedKeys`, fără numere)
- Seed ACME/BETA: `templateId`, phone/whatsapp demo `+4070000…`

## Verificare

```bash
pnpm --filter @auto-platform/web test
pnpm --filter @auto-platform/web lint
pnpm typecheck
pnpm --filter @auto-platform/web build
```
