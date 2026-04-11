"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { AuthBackground } from "@/components/auth-background";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AUTH_FLASH_KEY = "auth-flash";
const AUTH_FLASH_USERNAME_KEY = "auth-flash-username";
const authCardClass =
  "w-full max-w-sm rounded-3xl border border-border/60 bg-background/92 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/88 dark:border-white/10 dark:bg-slate-950/82 dark:shadow-black/40";
const authInputClass =
  "h-10 rounded-xl border-border/60 bg-background/70 px-3 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-border focus-visible:border-ring/80 focus-visible:ring-[3px] focus-visible:ring-ring/15";
const authPrimaryButtonClass =
  "h-10 rounded-xl shadow-sm transition-[transform,box-shadow,background-color] duration-200 hover:shadow-md";
const authGhostButtonClass =
  "h-10 rounded-xl border border-transparent transition-[background-color,border-color,color] duration-200 hover:border-border/40 hover:bg-muted/60";
const authIconButtonClass =
  "absolute inset-y-0 right-2 my-auto flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:bg-muted/60 hover:text-foreground hover:shadow-sm";

function SignInCardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthBackground>
      <Card className={authCardClass}>
        <CardHeader className="gap-1.5 px-6 pt-6 pb-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        {children}
      </Card>
    </AuthBackground>
  );
}

function SignInPageFallback() {
  return (
    <SignInCardShell>
      <div className="px-6 pb-6">
        <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Loading sign-in form...
        </div>
      </div>
    </SignInCardShell>
  );
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signupSuccessMessage =
    searchParams.get("signup") === "success"
      ? searchParams.get("username")?.trim()
        ? "Account created successfully! You can sign in now."
        : "Account created successfully. You can sign in now."
      : "";

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.signIn.username({
      username,
      password,
    });

    if (error) {
      setError(error.message ?? "Sign in failed");
    } else {
      window.sessionStorage.setItem(AUTH_FLASH_KEY, "login-success");
      window.sessionStorage.setItem(AUTH_FLASH_USERNAME_KEY, username.trim());
      router.push(searchParams.get("redirect") ?? "/dashboard");
    }

    setLoading(false);
  }

  return (
    <SignInCardShell>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4 px-6 py-5">
          {signupSuccessMessage && (
            <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-3 text-xs leading-relaxed text-emerald-800 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100">
              {signupSuccessMessage}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username" className="text-xs font-medium text-foreground/90">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={authInputClass}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-foreground/90">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass} pr-12`}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={authIconButtonClass}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeIcon size={18} /> : <EyeSlashIcon size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-xs leading-relaxed text-destructive">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border/50 px-6 pt-4 pb-6">
          <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={loading}>
            {loading ? "Please wait..." : "Sign In"}
          </Button>
          <Button type="button" variant="ghost" className={`w-full ${authGhostButtonClass}`} asChild>
            <Link href="/signup">Don&apos;t have an account? Sign Up</Link>
          </Button>
        </CardFooter>
      </form>
    </SignInCardShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}
