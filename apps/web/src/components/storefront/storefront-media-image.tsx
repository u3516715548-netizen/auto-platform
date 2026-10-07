"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type StorefrontMediaImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Responsive sizes — defaults suit catalog cards. */
  sizes?: string;
  /** Only the LCP / hero image should set this. */
  priority?: boolean;
  /** Shown when src is empty or the image fails (expired signed URL, etc.). */
  fallback?: ReactNode;
  /** Called when the image fails to load. */
  onError?: () => void;
};

/**
 * Storefront image via next/image.
 * Works for Supabase signed URLs (remotePatterns) and local `/demo-vehicles/*` paths.
 */
export function StorefrontMediaImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  fallback = null,
  onError,
}: StorefrontMediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
