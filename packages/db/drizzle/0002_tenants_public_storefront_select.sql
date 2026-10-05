-- Etapa 5: public storefront SELECT on tenants (active|trial only, anon session).
-- Does NOT weaken FORCE RLS. No INSERT/UPDATE/DELETE for public.
-- Staff membership SELECT policy remains unchanged.

CREATE POLICY tenants_select_public_storefront
ON public.tenants
FOR SELECT
USING (
  app.current_profile_id() IS NULL
  AND status IN ('active', 'trial')
);
