import {
  VEHICLE_FEATURE_KEYS,
  VEHICLE_FEATURE_LABELS_RO,
  type VehicleAccidentStatus,
  type VehicleBodyType,
  type VehicleCondition,
  type VehicleDriveType,
  type VehicleEmission,
  type VehicleFeatureKey,
  type VehicleFuel,
  type VehicleTransmission,
  type VehicleVatRegime,
} from "@auto-platform/types";

export const VEHICLE_FUEL_LABELS_RO: Record<VehicleFuel, string> = {
  petrol: "Benzină",
  diesel: "Diesel",
  hybrid: "Hibrid",
  plugin_hybrid: "Hibrid plug-in",
  electric: "Electric",
  lpg: "GPL",
  cng: "CNG",
  other: "Altul",
};

export const VEHICLE_TRANSMISSION_LABELS_RO: Record<VehicleTransmission, string> = {
  manual: "Manuală",
  automatic: "Automată",
  dct: "DCT",
  cvt: "CVT",
  other: "Altă",
};

export const VEHICLE_BODY_TYPE_LABELS_RO: Record<VehicleBodyType, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  estate: "Break / Estate",
  suv: "SUV",
  coupe: "Coupe",
  convertible: "Cabriolet",
  mpv: "Monovolum",
  van: "Utilitară",
  pickup: "Pickup",
  other: "Altă",
};

export const VEHICLE_DRIVE_TYPE_LABELS_RO: Record<VehicleDriveType, string> = {
  fwd: "Față",
  rwd: "Spate",
  awd: "Integrală (AWD)",
  "4wd": "4x4",
};

export const VEHICLE_CONDITION_LABELS_RO: Record<VehicleCondition, string> = {
  new: "Nou",
  used: "Second-hand",
  demo: "Demo",
};

export const VEHICLE_EMISSION_LABELS_RO: Record<VehicleEmission, string> = {
  euro_3: "Euro 3",
  euro_4: "Euro 4",
  euro_5: "Euro 5",
  euro_6: "Euro 6",
  euro_6d: "Euro 6d",
  euro_6e: "Euro 6e",
  ev: "Electric (fără emisii)",
  other: "Altă",
};

export const VEHICLE_VAT_REGIME_LABELS_RO: Record<VehicleVatRegime, string> = {
  deductible: "TVA deductibil",
  included: "TVA inclus",
  not_applicable: "Neaplicabil",
};

export const VEHICLE_ACCIDENT_STATUS_LABELS_RO: Record<VehicleAccidentStatus, string> = {
  none: "Fără daune",
  cosmetic: "Daune cosmetice",
  minor: "Daune minore",
  major: "Daune majore",
  unknown: "Necunoscut",
};

export function featureOptions(): Array<{ key: VehicleFeatureKey; label: string }> {
  return VEHICLE_FEATURE_KEYS.map((key) => ({
    key,
    label: VEHICLE_FEATURE_LABELS_RO[key],
  }));
}

export function enumOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}
