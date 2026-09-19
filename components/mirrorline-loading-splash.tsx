"use client";

import { useEffect, useState } from "react";

/**
 * A brief, progressively enhanced brand moment. The accompanying CSS keeps
 * this hidden unless the small inline bootstrap script in the root layout ran.
 */
export function MirrorlineLoadingSplash() {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dismissTimer = window.setTimeout(() => setIsLeaving(true), reduceMotion ? 150 : 650);
    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false);
      document.documentElement.removeAttribute("data-loading-splash");
    }, reduceMotion ? 150 : 900);

    return () => {
      window.clearTimeout(dismissTimer);
      window.clearTimeout(unmountTimer);
      document.documentElement.removeAttribute("data-loading-splash");
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`mirrorline-loading-splash${isLeaving ? " mirrorline-loading-splash--leaving" : ""}`}
    >
      <div className="mirrorline-loading-splash__content">
        <div className="mirrorline-loading-splash__mark">
          <span />
          <span />
        </div>
        <p className="mirrorline-loading-splash__eyebrow">MIRRORLINE</p>
        <p className="mirrorline-loading-splash__label">Research trading desk</p>
        <div className="mirrorline-loading-splash__line" />
      </div>
    </div>
  );
}
