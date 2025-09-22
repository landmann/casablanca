"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

import { env } from "@/env";

export const usePosthog = () => {
  useEffect(() => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: true,
    });
  }, []);
};
