"use client";

import { Lottie } from "lottie-react";
import { useSyncExternalStore } from "react";

const BEAR_WALK_SRC = "/brand/autobear-urs-walk.lottie.json";

type SaasBearWalkProps = {
  className?: string;
};

function subscribeReduceMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Client-only mount flag (SSR snapshot is always false). */
function subscribeMounted() {
  return () => {};
}

/**
 * Tiny Autobear walk mark under the hero secondary CTA.
 */
export function SaasBearWalk({ className }: SaasBearWalkProps) {
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, () => false);

  if (!mounted) {
    return (
      <span className={`saas-bear-walk ${className ?? ""}`} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/autobear-urs-walk.svg"
          alt=""
          width={44}
          height={42}
          className="saas-bear-walk-fallback"
        />
      </span>
    );
  }

  return (
    <span className={`saas-bear-walk ${className ?? ""}`} aria-hidden>
      <Lottie
        src={BEAR_WALK_SRC}
        loop={!reduceMotion}
        autoplay={!reduceMotion}
        className="saas-bear-walk-lottie"
      />
    </span>
  );
}
