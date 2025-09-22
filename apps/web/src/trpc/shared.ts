"use client";

import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@casablanca/api";

export const trpc = createTRPCReact<AppRouter>();
