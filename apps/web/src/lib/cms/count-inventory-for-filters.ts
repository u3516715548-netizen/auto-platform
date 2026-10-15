import {
  isInventoryPageKind,
  landingFiltersToSearchParamsRecord,
  type LandingCatalogFilters,
} from "@auto-platform/types";
import { listPublicVehiclesForCatalog } from "@/lib/storefront/public-vehicles";

/**
 * Counts available public vehicles matching landing filters (Host tenant).
 * Used at publish time for inventory page kinds.
 */
export async function countInventoryVehiclesForFilters(
  tenantId: string,
  pageKind: string,
  filters: LandingCatalogFilters,
): Promise<number> {
  if (!isInventoryPageKind(pageKind)) return 0;
  const params = landingFiltersToSearchParamsRecord(filters);
  const result = await listPublicVehiclesForCatalog(tenantId, params);
  return result.total;
}
