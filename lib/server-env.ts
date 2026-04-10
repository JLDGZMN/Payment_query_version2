import { normalizeConfiguredUrl } from "@/lib/app-url";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getDatabaseUrl() {
  const databaseUrl = readEnv("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return databaseUrl;
}

export function getAuthBaseUrl() {
  const vercelUrl = normalizeConfiguredUrl(readEnv("VERCEL_URL"));

  return (
    normalizeConfiguredUrl(readEnv("BETTER_AUTH_URL")) ??
    normalizeConfiguredUrl(readEnv("NEXT_PUBLIC_APP_URL")) ??
    vercelUrl ??
    "http://localhost:3000"
  );
}

export function getMissingServerEnv() {
  const missing: string[] = [];

  if (!readEnv("DATABASE_URL")) {
    missing.push("DATABASE_URL");
  }

  if (!readEnv("BETTER_AUTH_SECRET")) {
    missing.push("BETTER_AUTH_SECRET");
  }

  return missing;
}

export function getServerConfigErrorMessage() {
  const missing = getMissingServerEnv();

  if (missing.length === 0) {
    return null;
  }

  const plural = missing.length === 1 ? "" : "s";
  return `Missing required environment variable${plural}: ${missing.join(", ")}`;
}
