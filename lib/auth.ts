import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { getPool } from "@/lib/db";
import { getAuthBaseUrl } from "@/lib/server-env";

function createAuth() {
  return betterAuth({
    baseURL: getAuthBaseUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: getPool(),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!auth) {
    auth = createAuth();
  }

  return auth;
}

export type Auth = ReturnType<typeof createAuth>;
