"use client";

import { useEffect, useRef, useState } from "react";

const HERO_VIDEO_SRC = "/brand/autobear-hero.mp4";

/**
 * Cinematic hero background video — muted autoplay loop, independent of content layout.
 */
export function SaasHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduceMotion || failed) return;
    el.muted = true;
    const play = el.play();
    if (play) {
      void play.catch(() => {
        /* autoplay blocked — keep poster/fallback layer visible */
      });
    }
  }, [reduceMotion, failed]);

  if (reduceMotion || failed) {
    return <div className="saas-hero-video-fallback" aria-hidden />;
  }

  return (
    <video
      ref={videoRef}
      className="saas-hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      controls={false}
      aria-hidden
      onError={() => setFailed(true)}
    >
      <source src={HERO_VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
