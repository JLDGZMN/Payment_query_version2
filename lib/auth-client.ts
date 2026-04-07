import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

const baseURL = process.env.NEXT_PUBLIC_APP_URL?.trim();

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [usernameClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
