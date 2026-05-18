"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const MINIMUM_VISIBLE_MS = 900;
const FADE_OUT_MS = 360;

export default function AppPreloader() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    let closeTimer;
    let removeTimer;

    function finish() {
      const remaining = Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - startedAt));

      closeTimer = window.setTimeout(() => {
        setClosing(true);
        removeTimer = window.setTimeout(() => setVisible(false), FADE_OUT_MS);
      }, remaining);
    }

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(closeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[var(--dark)] transition-opacity duration-300 ${
        closing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[image:var(--bg-grid-lines)] opacity-35" />
      <div className="relative grid place-items-center px-6">
        <div className="relative h-40 w-64 animate-pulse sm:h-52 sm:w-80">
          <Image
            src="/text.png"
            alt=""
            fill
            sizes="(min-width: 640px) 20rem, 16rem"
            className="object-contain drop-shadow-[0_18px_55px_rgba(240,192,32,0.18)]"
            priority
          />
        </div>
        <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10 shadow-[0_0_24px_rgba(240,192,32,0.12)]">
          <span className="preloader-progress block h-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
