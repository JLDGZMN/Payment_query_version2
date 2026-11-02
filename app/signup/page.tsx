"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import {
  getPasswordValidation,
  getPasswordValidationErrorMessage,
} from "@/lib/password-validation";
import { AuthBackground } from "@/components/auth-background";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordValidation = useMemo(() => getPasswordValidation(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");

    if (!passwordValidation.isValid) {
      setError(getPasswordValidationErrorMessage(password));
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      username,
    } as Parameters<typeof authClient.signUp.email>[0]);

    if (error) {
      setError(error.message ?? "Sign up failed.");
    } else {
      window.localStorage.setItem(`auth-first-login:${username.trim().toLowerCase()}`, "pending");
      await authClient.signOut();
      const params = new URLSearchParams({ signup: "success" });
      const trimmedUsername = username.trim();

      if (trimmedUsername) {
        params.set("username", trimmedUsername);
      }

      router.push(`/?${params.toString()}`);
    }

    setLoading(false);
  }

  return (
    <AuthBackground>
      <Card className={authCardClass}>
        <CardHeader className="gap-1.5 px-6 pt-6 pb-1">
          <CardTitle className="text-xl font-semibold tracking-tight">Sign Up</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Create a new account to get started.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-foreground/90">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className={authInputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground/90">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={authInputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-foreground/90">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  aria-describedby={error ? "password-requirements signup-error" : "password-requirements"}
                  aria-invalid={password.length > 0 && !passwordValidation.isValid}
                  className={`${authInputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={authIconButtonClass}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              <ul
                id="password-requirements"
                className="mt-1 space-y-1 rounded-2xl border border-border/50 bg-muted/20 px-3.5 py-3 text-xs"
              >
                {passwordValidation.requirements.map((requirement) => {
                  const itemClass =
                    password.length === 0
                      ? "text-muted-foreground"
                      : requirement.isValid
                        ? "text-green-600"
                        : "text-destructive";

                  return (
                    <li key={requirement.id} className={`flex items-center gap-2 ${itemClass}`}>
                      <span aria-hidden="true" className="inline-flex w-4 justify-center font-semibold">
                        {requirement.isValid ? "✓" : "✗"}
                      </span>
                      <span>{requirement.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/90">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  aria-describedby={error ? "confirm-password-status signup-error" : "confirm-password-status"}
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  className={`${authInputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  className={authIconButtonClass}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              {confirmPassword ? (
                <p
                  id="confirm-password-status"
                  className={`text-xs ${passwordsMatch ? "text-green-600" : "text-amber-600"}`}
                >
                  {passwordsMatch ? "Passwords match." : "Passwords do not match yet."}
                </p>
              ) : null}
            </div>

            {error && (
              <p
                id="signup-error"
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-xs leading-relaxed text-destructive"
              >
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-border/50 px-6 pt-4 pb-6">
            <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={loading}>
              {loading ? "Please wait..." : "Create Account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`w-full ${authGhostButtonClass}`}
              asChild
            >
              <Link href="/">Already have an account? Sign In</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthBackground>
  );
}
