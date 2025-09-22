"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";

import { TRPCReactProvider } from "@/trpc/react";
import { usePosthog } from "@/lib/posthog";

export const Providers = ({ children }: { children: ReactNode }) => {
  usePosthog();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ThemeProvider>
  );
};
