"use client";

import { useEffect, useRef } from "react";

type TurnstileWidgetId = string | number;

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
};

type TurnstileApi = {
  render: (target: HTMLElement, options: TurnstileRenderOptions) => TurnstileWidgetId;
  remove: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __alTurnstileReadyPromise?: Promise<void>;
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__alTurnstileReadyPromise) {
    return window.__alTurnstileReadyPromise;
  }

  window.__alTurnstileReadyPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load CAPTCHA script."));
    document.head.appendChild(script);
  });

  return window.__alTurnstileReadyPromise;
}

export default function CaptchaField({
  onTokenChange,
  theme = "light",
}: {
  onTokenChange: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<TurnstileWidgetId | null>(null);

  useEffect(() => {
    onTokenChange(null);

    if (!TURNSTILE_SITE_KEY || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(null),
          "error-callback": () => onTokenChange(null),
        });
      })
      .catch(() => {
        onTokenChange(null);
      });

    return () => {
      cancelled = true;
      if (widgetRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [onTokenChange, theme]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div style={{ marginTop: "0.75rem", marginBottom: "0.75rem" }}>
      <div ref={containerRef} />
    </div>
  );
}
