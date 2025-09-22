import { betterAuth, type Auth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory-adapter";

import { parseAuthEnv, type AuthEnv } from "./env";

export type { AuthEnv } from "./env";
export type { Session, User } from "better-auth";

export interface CreateCasablancaAuthOptions {
  env?: NodeJS.ProcessEnv;
  memoryDb?: MemoryDB;
}

let currentAuth: Auth | null = null;

export const createCasablancaAuth = (
  options: CreateCasablancaAuthOptions = {}
) => {
    const env = parseAuthEnv(options.env ?? process.env);

    if (currentAuth) {
      return currentAuth;
    }

    const db = options.memoryDb ?? {
      user: [],
      session: [],
      verification: [],
      account: [],
    } satisfies MemoryDB;

    currentAuth = betterAuth({
      baseURL: env.NEXT_PUBLIC_APP_URL,
      secret: env.BETTER_AUTH_SECRET,
      database: memoryAdapter(db),
      session: {
        expiresIn: env.BETTER_AUTH_SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
      },
      emailAndPassword: {
        enabled: true,
      },
    });

    return currentAuth;
};

export const getCasablancaAuth = () => {
  if (!currentAuth) {
    return createCasablancaAuth();
  }

  return currentAuth;
};
