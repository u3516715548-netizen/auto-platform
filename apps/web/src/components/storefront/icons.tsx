import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    ...props,
  };
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconCar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M5 16h14v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2Zm1.2-7.5L7.6 6.2A2 2 0 0 1 9.4 5h5.2a2 2 0 0 1 1.8 1.2l1.4 2.3H6.2ZM5 10h14l-.3 4H5.3L5 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 3h3l1 5-2 1a12 12 0 0 0 5 5l1-2 5 1v3a2 2 0 0 1-2 2A15 15 0 0 1 5 5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconWhatsApp(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor" })}>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.93.52 3.75 1.44 5.34L2 22l4.98-1.55a9.86 9.86 0 0 0 5.06 1.38h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.52 13.95c-.23.64-1.34 1.18-1.86 1.26-.48.07-1.08.1-1.74-.11-.4-.12-.91-.28-1.57-.55-2.76-1.19-4.55-3.96-4.69-4.14-.14-.19-1.14-1.51-1.14-2.88 0-1.37.72-2.04.97-2.32.26-.28.56-.35.75-.35h.54c.17 0 .4-.06.62.47.23.55.78 1.9.85 2.04.07.14.12.3.02.49-.1.19-.14.3-.28.47-.14.16-.3.36-.42.49-.14.14-.28.29-.12.56.16.28.72 1.18 1.54 1.91 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.32.07.12.07.67-.16 1.31Z" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3v10M8 7l4-4 4 4M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBookmark(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 3h10a1 1 0 0 1 1 1v17l-6-3.5L6 21V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBookmarkFilled(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor" })}>
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-3.5L6 21V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconHeartFilled(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor" })}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

export function IconCompare(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 7h11M7 7l2.5-2.5M7 7l2.5 2.5M17 17H6M17 17l-2.5-2.5M17 17l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSort(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M8 5v14M8 5 5.5 8M8 5l2.5 3M16 19V5M16 19l2.5-3M16 19l-2.5-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLocation(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor" })}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base({ ...props, fill: "currentColor" })}>
      <path d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconGauge(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 12 16 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconEngine(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 10h2l1-2h4l1 2h2v3h2v2h-2v2H7v-2H5v-2h2v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconFuel(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 4h7v12H7V4Zm7 3h2.5A2.5 2.5 0 0 1 19 9.5V16a2 2 0 1 0 0-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBody(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 14h16l-1.5-4.5A3 3 0 0 0 15.6 7H8.4a3 3 0 0 0-2.9 2.5L4 14Zm1 0v3h2v-1h10v1h2v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3c2 3 1 5-1 7 3 0 5 2 5 5a6 6 0 1 1-12 0c0-4 3-6 4-8 1 2 2 2 4-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDrop(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLeaf(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 19c2-4 6-8 10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBattery(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 11h2v4h-2M8 12h5M10.5 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconCloud(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M8 18h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.5 1.5A3.5 3.5 0 0 0 8 18Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTransmission(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5v2.5h8V10.5M12 13v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconDrive(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconDoors(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M6 5h9l3 4v10H6V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M15 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSeats(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 6h4v6H7V6Zm6 0h4v6h-4V6ZM5 14h14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPalette(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 4a8 8 0 1 0 0 16h1.5a2.5 2.5 0 0 0 0-5H12a3 3 0 1 1 0-6 3 3 0 0 1 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="14" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconComfort(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 4v3M8 7l-2 2M16 7l2 2M6 14h12l-1.5 5h-9L6 14Zm3-3a3 3 0 0 1 6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChip(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M9 18V6l10-2v12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSuv(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 14h16l-1-4.2A3 3 0 0 0 16.1 7H8.2A3 3 0 0 0 5.3 9.3L4 14Zm1 0v3h2v-1h10v1h2v-3M7.5 14.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSedan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14h18l-1.2-3.5A2.5 2.5 0 0 0 17.4 9H14l-1.5-2.5a2 2 0 0 0-1.7-.9H8.2A2 2 0 0 0 6.4 7L5 9H4.5A2 2 0 0 0 2.6 11L3 14Zm1.5 0v2.5h2V15h11v1.5h2V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconEstate(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14h18V9.5A2.5 2.5 0 0 0 18.5 7H8L5.5 9.2A3 3 0 0 0 5 11v3Zm1.5 0v2.5h2V15h11v1.5h2V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCoupe(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14h18l-2-4.5A3 3 0 0 0 16.2 7H9L5.5 10.5 3 14Zm1.5 0v2.5h2V15h11v1.5h2V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconConvertible(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 14h16l-1-3H5l-1 3Zm1.5 0v2.5h2V15h9v1.5h2V14M7 9c1.5-2 3.5-3 5-3s3.5 1 5 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconHatchback(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 14h16l-1.5-4A3 3 0 0 0 15.6 7H9L5.5 10 4 14Zm1.5 0v2.5h2V15h11v1.5h2V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconVan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14V8a2 2 0 0 1 2-2h10v8H3Zm12 0h4l2 3v1h-2.5a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPickup(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14h11V8H8L5 11H3v3Zm11 0h5l2 2v2h-2.2a2 2 0 0 1-3.6 0H9a2 2 0 0 1-3.6 0H3v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMpv(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 14h18V9.2A2.2 2.2 0 0 0 18.8 7H6.5L3.8 9.5 3 14Zm1.5 0v2.5h2V15h11v1.5h2V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
