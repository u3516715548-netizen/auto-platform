import type { JsonLdObject } from "@/lib/seo/build-json-ld";

type JsonLdProps = {
  data: JsonLdObject | JsonLdObject[];
};

/**
 * Safe JSON-LD script tag. Escapes `<` to avoid XSS via crafted strings.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // Structured data only — content is JSON-escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
