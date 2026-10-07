/**
 * Isolated demo data for theme preview only.
 * Never load tenant / Supabase data into this module.
 * Cover images are local public assets under /demo-vehicles — not used by public catalog.
 */

import { TEMPLATE_1_FALLBACK_PRIMARY_COLOR } from "@auto-platform/types";
import type { PublicVehicleDto } from "@/lib/storefront/public-dto";
import type { PublicVehicleCatalogDto } from "@/lib/storefront/public-vehicle-media";
import type { PublicVehicleImageDto } from "@/lib/storefront/public-gallery-helpers";

export type DemoVehicle = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  priceEur: number;
  mileageKm: number;
  fuel: NonNullable<PublicVehicleDto["fuel"]>;
  transmission: NonNullable<PublicVehicleDto["transmission"]>;
  bodyType: NonNullable<PublicVehicleDto["bodyType"]>;
  driveType: NonNullable<PublicVehicleDto["driveType"]>;
  powerHp: number;
  engineDisplacementCc: number;
  doors: number;
  seats: number;
  exteriorColor: string;
  city: string;
  description: string;
  features: PublicVehicleDto["features"];
  /** Local path under /public — never an external URL. */
  coverSrc: string;
  coverTone: "slate" | "zinc" | "stone" | "neutral" | "sky" | "amber";
};

export type DemoDealer = {
  name: string;
  email: string;
  phoneDisplay: string;
  phone: string;
  city: string;
  accentColor: string;
  slug: string;
};

export const DEMO_DEALER: DemoDealer = {
  name: "Demo Motors",
  email: "contact@demo-motors.test",
  phoneDisplay: "+40 700 000 000",
  phone: "+40700000000",
  city: "București",
  accentColor: TEMPLATE_1_FALLBACK_PRIMARY_COLOR,
  slug: "demo-motors",
};

export const DEMO_VEHICLES: readonly DemoVehicle[] = [
  {
    id: "demo-maserati-gt",
    slug: "maserati-granturismo",
    make: "Maserati",
    model: "GranTurismo",
    year: 2022,
    priceEur: 90_000,
    mileageKm: 15_000,
    fuel: "petrol",
    transmission: "automatic",
    bodyType: "coupe",
    driveType: "rwd",
    powerHp: 450,
    engineDisplacementCc: 2990,
    doors: 2,
    seats: 4,
    exteriorColor: "Alb perlat",
    city: "București",
    description:
      "Maserati GranTurismo elegant, finisaj alb perlat, motor puternic și habitaclu premium. Date demo pentru previzualizarea temei — vehicul fictiv.",
    features: [
      { key: "abs", label: "ABS" },
      { key: "esp", label: "ESP" },
      { key: "airbag", label: "Airbag-uri" },
      { key: "climate_auto", label: "Climatronic" },
      { key: "leather", label: "Tapiserie piele" },
      { key: "heated_seats", label: "Scaune încălzite" },
      { key: "nav", label: "Navigație" },
      { key: "parking_camera", label: "Cameră parcare" },
      { key: "led_lights", label: "Faruri LED" },
      { key: "keyless", label: "Keyless" },
    ],
    coverSrc: "/demo-vehicles/maserati-granturismo.jpg",
    coverTone: "neutral",
  },
  {
    id: "demo-audi-rs6",
    slug: "audi-rs6",
    make: "Audi",
    model: "RS 6",
    year: 2023,
    priceEur: 78_500,
    mileageKm: 22_000,
    fuel: "petrol",
    transmission: "automatic",
    bodyType: "sedan",
    driveType: "awd",
    powerHp: 600,
    engineDisplacementCc: 3996,
    doors: 4,
    seats: 5,
    exteriorColor: "Albastru metalizat",
    city: "București",
    description:
      "Audi RS 6 sportiv, tracțiune integrală, faruri LED Matrix și jante performante. Date demo Theme Gallery — fără legătură cu inventarul real.",
    features: [
      { key: "abs", label: "ABS" },
      { key: "esp", label: "ESP" },
      { key: "airbag", label: "Airbag-uri" },
      { key: "climate_auto", label: "Climatronic" },
      { key: "leather", label: "Tapiserie piele" },
      { key: "adaptive_cruise", label: "Tempomat adaptiv" },
      { key: "parking_sensors", label: "Senzori parcare" },
      { key: "parking_camera", label: "Cameră parcare" },
      { key: "android_auto", label: "Android Auto" },
      { key: "carplay", label: "Apple CarPlay" },
      { key: "led_lights", label: "Faruri LED" },
    ],
    coverSrc: "/demo-vehicles/audi-rs6.jpg",
    coverTone: "sky",
  },
  {
    id: "demo-koenigsegg-ccx",
    slug: "koenigsegg-ccx",
    make: "Koenigsegg",
    model: "CCX",
    year: 2021,
    priceEur: 185_000,
    mileageKm: 8_000,
    fuel: "petrol",
    transmission: "automatic",
    bodyType: "coupe",
    driveType: "rwd",
    powerHp: 800,
    engineDisplacementCc: 4700,
    doors: 2,
    seats: 2,
    exteriorColor: "Roșu metalizat",
    city: "București",
    description:
      "Hypercar demo în roșu metalizat, aerodinamică agresivă și performanțe extreme. Conținut fictiv pentru preview Template 1.",
    features: [
      { key: "abs", label: "ABS" },
      { key: "esp", label: "ESP" },
      { key: "airbag", label: "Airbag-uri" },
      { key: "climate_auto", label: "Climatronic" },
      { key: "leather", label: "Tapiserie piele" },
      { key: "nav", label: "Navigație" },
      { key: "led_lights", label: "Faruri LED" },
      { key: "keyless", label: "Keyless" },
      { key: "sunroof", label: "Plafon panoramic" },
    ],
    coverSrc: "/demo-vehicles/koenigsegg-ccx.jpg",
    coverTone: "amber",
  },
] as const;

export const DEMO_COVER_GRADIENT: Record<DemoVehicle["coverTone"], string> = {
  slate: "linear-gradient(145deg, #334155 0%, #94a3b8 55%, #e2e8f0 100%)",
  zinc: "linear-gradient(145deg, #3f3f46 0%, #a1a1aa 55%, #f4f4f5 100%)",
  stone: "linear-gradient(145deg, #44403c 0%, #a8a29e 55%, #f5f5f4 100%)",
  neutral: "linear-gradient(145deg, #262626 0%, #737373 55%, #f5f5f5 100%)",
  sky: "linear-gradient(145deg, #0c4a6e 0%, #38bdf8 55%, #e0f2fe 100%)",
  amber: "linear-gradient(145deg, #92400e 0%, #fbbf24 55%, #fef3c7 100%)",
};

export function formatDemoPriceEur(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDemoMileageKm(km: number): string {
  return `${new Intl.NumberFormat("ro-RO").format(km)} km`;
}

export function findDemoVehicle(slug: string): DemoVehicle | undefined {
  return DEMO_VEHICLES.find((v) => v.slug === slug);
}

export function filterDemoVehicles(query: string): DemoVehicle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...DEMO_VEHICLES];
  return DEMO_VEHICLES.filter(
    (v) =>
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      `${v.make} ${v.model}`.toLowerCase().includes(q),
  );
}

function demoCoverImage(vehicle: DemoVehicle): PublicVehicleImageDto {
  return {
    url: vehicle.coverSrc,
    altText: `${vehicle.make} ${vehicle.model}`,
    sortOrder: 0,
    isCover: true,
  };
}

function demoVehicleToDto(vehicle: DemoVehicle): PublicVehicleDto {
  return {
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileageKm,
    price: String(vehicle.priceEur),
    currency: "EUR",
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    bodyType: vehicle.bodyType,
    condition: "used",
    powerHp: vehicle.powerHp,
    description: vehicle.description,
    driveType: vehicle.driveType,
    engineDisplacementCc: vehicle.engineDisplacementCc,
    emissionStandard: "euro_6",
    doors: vehicle.doors,
    seats: vehicle.seats,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: "Negru",
    firstRegistrationYear: vehicle.year,
    firstRegistrationMonth: 6,
    priceNegotiable: false,
    vatRegime: null,
    originCountry: "RO",
    locationCity: vehicle.city,
    warrantyMonths: null,
    warrantyNotes: null,
    hasServiceBook: true,
    hasServiceHistory: true,
    accidentStatus: "none",
    features: vehicle.features,
  };
}

/**
 * Maps a demo vehicle to catalog DTO shape for Template 1 card fidelity.
 * coverImage.url is a local /demo-vehicles path — never Supabase.
 */
export function demoVehicleToCatalogDto(vehicle: DemoVehicle): PublicVehicleCatalogDto {
  return {
    ...demoVehicleToDto(vehicle),
    coverImage: demoCoverImage(vehicle),
  };
}

export function demoVehicleToDetailDto(vehicle: DemoVehicle): PublicVehicleDto & {
  images: PublicVehicleImageDto[];
} {
  return {
    ...demoVehicleToDto(vehicle),
    images: [demoCoverImage(vehicle)],
  };
}

export function listDemoCatalogDtos(query = ""): PublicVehicleCatalogDto[] {
  return filterDemoVehicles(query).map(demoVehicleToCatalogDto);
}

/**
 * Other demo vehicles for “Alte alternative” — excludes current slug, no Supabase.
 */
export function listDemoVehicleAlternatives(
  excludeSlug: string,
  limit = 8,
): PublicVehicleCatalogDto[] {
  const safeLimit = Math.min(8, Math.max(0, Math.floor(limit)));
  if (safeLimit === 0 || !excludeSlug) return [];
  return DEMO_VEHICLES.filter((v) => v.slug !== excludeSlug)
    .slice(0, safeLimit)
    .map(demoVehicleToCatalogDto);
}
