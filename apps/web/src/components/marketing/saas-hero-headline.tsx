"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

/** Fixed line — never animates on rotate. */
export const HERO_TITLE_FIXED = "Creează-ți";

/**
 * Rotating continuations — keep in sync if adding background scenes later.
 * Index is stable for future video pairing.
 */
export const HERO_TITLE_PHRASES = [
  "showroom-ul auto.",
  "propriul brand.",
  "prezența online.",
  "propria imagine.",
  "respectul.",
  "viitorul tău site.",
] as const;

/** Hold while phrase is fully visible. */
const HOLD_MS = 3800;
/** Per-word slide duration. */
const WORD_MS = 520;
/** Stagger between words — within 0.1–2s. */
const WORD_STAGGER_MS = 220;
/** Pause after full exit before next phrase enters. */
const EXIT_GAP_MS = 100;

type Phase = "boot" | "in" | "hold" | "out" | "gap";

function splitWords(phrase: string): string[] {
  return phrase.trim().split(/\s+/).filter(Boolean);
}

function phraseAt(index: number): string {
  return HERO_TITLE_PHRASES[
    ((index % HERO_TITLE_PHRASES.length) + HERO_TITLE_PHRASES.length) % HERO_TITLE_PHRASES.length
  ]!;
}

function phraseTransitionMs(phrase: string): number {
  const n = Math.max(1, splitWords(phrase).length);
  return WORD_MS + (n - 1) * WORD_STAGGER_MS;
}

function subscribeReduceMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PhraseLine({
  phrase,
  mode,
}: {
  phrase: string;
  mode: "measure" | "in" | "out" | "static";
}) {
  const words = splitWords(phrase);
  const className =
    mode === "measure"
      ? "saas-hero-dynamic-line saas-hero-dynamic-measure"
      : `saas-hero-dynamic-line is-${mode}`;

  return (
    <span className={className} aria-hidden={mode === "measure" || mode === "out" ? true : undefined}>
      {words.map((word, i) => (
        <span
          key={`${phrase}-${i}-${word}`}
          className="saas-hero-word"
          style={{ "--i": i } as CSSProperties}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </span>
  );
}

/**
 * Fixed line + word-by-word vertical slide.
 * Sequence: enter → hold → exit (staggered) → 100ms gap → next enter.
 */
export function SaasHeroHeadline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("boot");
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, () => true);

  useEffect(() => {
    if (reduceMotion) {
      const bootId = window.setTimeout(() => setPhase("hold"), 0);
      const id = window.setInterval(() => {
        setIndex((current) => (current + 1) % HERO_TITLE_PHRASES.length);
      }, HOLD_MS);
      return () => {
        window.clearTimeout(bootId);
        window.clearInterval(id);
      };
    }

    if (phase === "boot") {
      const bootId = window.setTimeout(() => setPhase("in"), 0);
      return () => window.clearTimeout(bootId);
    }

    const phrase = phraseAt(index);
    let timeoutId = 0;

    if (phase === "in") {
      timeoutId = window.setTimeout(() => setPhase("hold"), phraseTransitionMs(phrase));
    } else if (phase === "hold") {
      timeoutId = window.setTimeout(() => setPhase("out"), HOLD_MS);
    } else if (phase === "out") {
      timeoutId = window.setTimeout(() => setPhase("gap"), phraseTransitionMs(phrase));
    } else if (phase === "gap") {
      timeoutId = window.setTimeout(() => {
        setIndex((current) => (current + 1) % HERO_TITLE_PHRASES.length);
        setPhase("in");
      }, EXIT_GAP_MS);
    }

    return () => window.clearTimeout(timeoutId);
  }, [reduceMotion, phase, index]);

  const showLine = phase !== "gap" && phase !== "boot";
  const lineMode =
    reduceMotion || phase === "hold" ? "static" : phase === "out" ? "out" : phase === "in" ? "in" : "static";

  return (
    <h1 className="saas-hero-title">
      <span className="saas-hero-title-fixed">{HERO_TITLE_FIXED}</span>
      <span className="saas-hero-dynamic" aria-live="polite">
        {HERO_TITLE_PHRASES.map((phrase) => (
          <PhraseLine key={`m-${phrase}`} phrase={phrase} mode="measure" />
        ))}
        {showLine ? (
          <PhraseLine key={`${index}-${phase === "out" ? "out" : "show"}`} phrase={phraseAt(index)} mode={lineMode} />
        ) : null}
      </span>
    </h1>
  );
}
