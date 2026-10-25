/**
 * Environment variable validation with safe logging.
 *
 * Validates required environment variables at startup. Never logs values —
 * only confirms presence and (for connection strings) the parsed host so
 * operators can confirm configuration without leaking credentials.
 */

const POSTGRES_HOST_RE = /postgres(?:ql)?:\/\/[^:]*:[^@]*@([^:\s/?#]+)/;

function parsePostgresHost(databaseUrl: string): string | null {
  const match = databaseUrl.match(POSTGRES_HOST_RE);
  return match ? (match[1] ?? null) : null;
}

export interface EnvValidation {
  ok: boolean;
  errors: string[];
  dbHost: string | null;
}

/**
 * Validate that all required environment variables are set.
 * Returns an object with `ok`, a list of `errors`, and a redacted `dbHost`.
 * Safe to call early in startup (middleware, layout, route handlers).
 */
export function validateEnv(): EnvValidation {
  const errors: string[] = [];
  let dbHost: string | null = null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    errors.push("DATABASE_URL is not set");
  } else {
    dbHost = parsePostgresHost(databaseUrl);
    if (!dbHost) {
      errors.push("DATABASE_URL is not a valid PostgreSQL connection string");
    }
  }

  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    errors.push("AUTH_SECRET is missing or too short (minimum 32 characters)");
  }

  return { ok: errors.length === 0, errors, dbHost };
}

/**
 * Environment mode detection for conditional configuration.
 */
export function getEnvMode(): "production" | "preview" | "development" {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV) return "preview";
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

/**
 * Returns true when running on Vercel's Edge or Node runtime in preview/deployment.
 */
export function isVercelDeployment(): boolean {
  return !!process.env.VERCEL && !!process.env.VERCEL_ENV;
}

export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}
