"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useSession, authClient } from "@/lib/auth-client";
import {
  getPasswordValidation,
  getPasswordValidationErrorMessage,
} from "@/lib/password-validation";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

const dashboardCardClass =
  "rounded-3xl border border-border/60 bg-background/92 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.3)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/88";
const dashboardHeroCardClass =
  "overflow-hidden rounded-3xl border border-border/60 bg-background/92 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.32)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/88";
const dashboardInputClass =
  "rounded-xl border-border/60 bg-background/75 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-border focus-visible:border-ring/80 focus-visible:ring-[3px] focus-visible:ring-ring/15";
const dashboardReadOnlyInputClass =
  "rounded-xl border-border/50 bg-muted/55 shadow-sm";
const dashboardPrimaryButtonClass =
  "rounded-xl shadow-sm transition-[transform,box-shadow,background-color,border-color] duration-200 hover:shadow-md";
const dashboardDestructiveButtonClass =
  "rounded-xl shadow-sm transition-[transform,box-shadow,background-color,border-color] duration-200 hover:shadow-md";
const dashboardIconButtonClass =
  "absolute inset-y-0 right-2 my-auto flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:bg-muted/60 hover:text-foreground hover:shadow-sm";
const dashboardBadgeClass =
  "rounded-full border border-border/60 bg-background/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm";
const dashboardMutedPanelClass =
  "rounded-2xl border border-border/60 bg-muted/30 shadow-sm";
const dashboardErrorClass =
  "rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm leading-relaxed text-destructive";
const dashboardSuccessClass =
  "rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-3 text-sm leading-relaxed text-emerald-800 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100";
const developmentTeam = [
  "Julio De Guzman",
  "Ivy Callope",
  "Carla Buganan",
  "Lacel Centeno",
  "Rizza Rovira",
  "Baby Jane De Jesus",
];

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");
  const [signOutLoading, setSignOutLoading] = useState(false);

  const currentName = session?.user?.name ?? "";
  const currentEmail = session?.user?.email ?? "";
  const username = (session?.user as Record<string, string> | undefined)?.username ?? "";
  const passwordValidation = useMemo(() => getPasswordValidation(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const nameChanged = name.trim() !== "" && name.trim() !== currentName;

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (isPending) {
    return (
      <SidebarInset>
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <span className="text-xs font-medium text-muted-foreground">Profile</span>
        </header>
        <div className="flex items-center justify-center p-8">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading profile...
          </p>
        </div>
      </SidebarInset>
    );
  }

  async function handleUpdateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameError("");
    setNameSuccess(false);

    if (!nameChanged) {
      setNameError("Enter a new display name before saving.");
      return;
    }

    setNameLoading(true);
    const { error } = await authClient.updateUser({ name: name.trim() });

    if (error) {
      const message = error.message ?? "Failed to update name.";
      setNameError(message);
      toast.error(message);
    } else {
      setNameSuccess(true);
      toast.success("Display name updated.");
    }

    setNameLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (!passwordValidation.isValid) {
      setPwError(getPasswordValidationErrorMessage(newPassword));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (error) {
      const message = error.message ?? "Failed to change password.";
      setPwError(message);
      toast.error(message);
    } else {
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    }

    setPwLoading(false);
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    await authClient.signOut();
    window.sessionStorage.setItem("auth-flash", "logout-success");
    router.push("/");
  }

  return (
    <SidebarInset>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
        <span className="text-xs font-medium text-muted-foreground">Profile</span>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <Card className={dashboardHeroCardClass}>
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-14">
                <AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-primary">
                  {getInitials(currentName || username || currentEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {currentName || "Your profile"}
                  </h1>
                  <Badge variant="outline" className={dashboardBadgeClass}>Account settings</Badge>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Review your account details, update how your name appears, and keep your
                  sign-in secure.
                </p>
              </div>
            </div>
            <div className={`px-4 py-3 text-sm ${dashboardMutedPanelClass}`}>
              <p className="font-medium">Signed in as</p>
              <p className="text-muted-foreground">{currentEmail || "No email available"}</p>
              <Button
                type="button"
                variant="destructive"
                className={`mt-3 w-full ${dashboardDestructiveButtonClass}`}
                onClick={handleSignOut}
                disabled={signOutLoading}
              >
                {signOutLoading ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardCardClass}>
          <CardHeader className="gap-1.5 border-b border-border/50 px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Profile details</CardTitle>
            <CardDescription className="text-sm leading-relaxed">Your current account information at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/90">Full name</Label>
              <Input value={currentName} readOnly className={dashboardReadOnlyInputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/90">Username</Label>
              <Input value={username} readOnly className={dashboardReadOnlyInputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/90">Email</Label>
              <Input value={currentEmail} readOnly className={dashboardReadOnlyInputClass} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className={`h-full ${dashboardCardClass}`}>
            <form onSubmit={handleUpdateName} className="flex flex-1 flex-col">
              <CardHeader className="gap-1.5 border-b border-border/50 px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Update display name</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  This is the name shown across the dashboard and account menus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium text-foreground/90">Display name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError("");
                      setNameSuccess(false);
                    }}
                    disabled={nameLoading}
                    required
                    className={dashboardInputClass}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep it recognizable so teammates and accounting staff can identify your
                  requests quickly.
                </p>
                {nameError ? <p className={dashboardErrorClass}>{nameError}</p> : null}
                {nameSuccess ? (
                  <p className={`flex items-center gap-2 ${dashboardSuccessClass}`}>
                    <CheckCircleIcon size={16} />
                    Name updated successfully.
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 pt-4 pb-6">
                <Button type="submit" className={`w-full sm:w-auto ${dashboardPrimaryButtonClass}`} disabled={nameLoading || !nameChanged}>
                  {nameLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      Saving changes...
                    </span>
                  ) : (
                    "Save name"
                  )}
                </Button>
              </CardFooter>
            </form>
            <div className="border-t border-border/50 px-6 pb-6 pt-5">
              <section
                aria-labelledby="development-team-title"
                className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-5 text-center shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
                  System Credits
                </p>
                <h3
                  id="development-team-title"
                  className="mt-2 text-sm font-semibold tracking-[0.08em] text-foreground/90"
                >
                  Built by the Development Team
                </h3>
                <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {developmentTeam.map((member) => (
                    <li
                      key={member}
                      className="font-medium tracking-[0.01em] text-muted-foreground"
                    >
                      {member}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Card>

          <Card className={`h-full ${dashboardCardClass}`}>
            <form onSubmit={handleChangePassword}>
              <CardHeader className="gap-1.5 border-b border-border/50 px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold tracking-tight">Security</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-relaxed">
                      Change your password and protect your account sessions.
                    </CardDescription>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-border/50 bg-background/75 text-primary shadow-sm">
                    <ShieldCheckIcon size={18} weight="fill" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs font-medium text-foreground/90">Current password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={pwLoading}
                      required
                      className={`${dashboardInputClass} pr-12`}
                    />
                    <button
                      type="button"
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                      className={dashboardIconButtonClass}
                      onClick={() => setShowCurrentPassword((value) => !value)}
                    >
                      {showCurrentPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-medium text-foreground/90">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Create a stronger password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPwError("");
                        setPwSuccess(false);
                      }}
                      aria-describedby={pwError ? "profile-password-requirements profile-password-error" : "profile-password-requirements"}
                      aria-invalid={newPassword.length > 0 && !passwordValidation.isValid}
                      disabled={pwLoading}
                      required
                      className={`${dashboardInputClass} pr-12`}
                    />
                    <button
                      type="button"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      className={dashboardIconButtonClass}
                      onClick={() => setShowNewPassword((value) => !value)}
                    >
                      {showNewPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                  <ul
                    id="profile-password-requirements"
                    className="mt-1 space-y-1 rounded-2xl border border-border/50 bg-muted/20 px-3.5 py-3 text-xs"
                  >
                    {passwordValidation.requirements.map((requirement) => {
                      const itemClass =
                        newPassword.length === 0
                          ? "text-muted-foreground"
                          : requirement.isValid
                            ? "text-green-600"
                            : "text-destructive";

                      return (
                        <li key={requirement.id} className={`flex items-center gap-2 ${itemClass}`}>
                          <span aria-hidden="true" className="inline-flex w-4 justify-center font-semibold">
                            {requirement.isValid ? "OK" : "X"}
                          </span>
                          <span>{requirement.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/90">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPwError("");
                        setPwSuccess(false);
                      }}
                      aria-describedby={pwError ? "profile-confirm-password-status profile-password-error" : "profile-confirm-password-status"}
                      aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                      disabled={pwLoading}
                      required
                      className={`${dashboardInputClass} pr-12`}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                      className={dashboardIconButtonClass}
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                  {confirmPassword ? (
                    <p
                      id="profile-confirm-password-status"
                      className={`text-xs ${passwordsMatch ? "text-green-600" : "text-amber-600"}`}
                    >
                      {passwordsMatch ? "Passwords match." : "Passwords do not match yet."}
                    </p>
                  ) : null}
                </div>

                <div className={`p-4 text-sm text-muted-foreground ${dashboardMutedPanelClass}`}>
                  For your security, use a strong and unique password when updating your account.
                </div>

                {pwError ? (
                  <p id="profile-password-error" className={`flex items-center gap-2 ${dashboardErrorClass}`}>
                    <WarningCircleIcon size={16} />
                    {pwError}
                  </p>
                ) : null}
                {pwSuccess ? (
                  <p className={`flex items-center gap-2 ${dashboardSuccessClass}`}>
                    <CheckCircleIcon size={16} />
                    Password changed successfully.
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 pt-4 pb-6">
                <Button
                  type="submit"
                  className={`w-full sm:w-auto ${dashboardPrimaryButtonClass}`}
                  disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                  {pwLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      Updating password...
                    </span>
                  ) : (
                    "Change password"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
