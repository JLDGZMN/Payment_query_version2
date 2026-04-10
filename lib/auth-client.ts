import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { normalizeConfiguredUrl } from "@/lib/app-url";

const baseURL = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_APP_URL);

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [usernameClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
