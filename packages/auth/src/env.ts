import { z } from "zod";

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters for security"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL including protocol"),
  BETTER_AUTH_SESSION_MAX_AGE_DAYS: z
    .coerce.number()
    .min(1, "BETTER_AUTH_SESSION_MAX_AGE_DAYS must be at least 1 day")
    .max(365, "BETTER_AUTH_SESSION_MAX_AGE_DAYS must be less than or equal to 365 days")
    .default(30),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export const parseAuthEnv = (env: NodeJS.ProcessEnv): AuthEnv => {
  const parsed = authEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid BetterAuth environment variables:\n${parsed.error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return parsed.data;
};
