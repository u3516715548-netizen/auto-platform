/**
 * In-page section ids for vehicle detail (SEO / anchors).
 * The separate sticky tab bar was removed — sections keep their headings inline.
 */
export const VEHICLE_DETAIL_SECTIONS = [
  { id: "vehicle-section-finance", num: "01", label: "Finanțare" },
  { id: "vehicle-section-tech", num: "02", label: "Tehnic + Dotări" },
  { id: "vehicle-section-description", num: "03", label: "Descriere" },
] as const;
