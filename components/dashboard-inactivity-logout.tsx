"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LAST_ACTIVITY_KEY = "dashboard-last-activity";
const SESSION_EXPIRED_KEY = "dashboard-session-expired";
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_PERSIST_INTERVAL_MS = 10 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "mousemove",
];

function parseTimestamp(value: string | null) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function DashboardInactivityLogout() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [redirectingToSignIn, setRedirectingToSignIn] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lastPersistedActivityRef = useRef(0);
  const hasExpiredRef = useRef(false);

  const persistActivity = useEffectEvent((force = false) => {
    if (hasExpiredRef.current) {
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;

    if (
      force ||
      now - lastPersistedActivityRef.current >= ACTIVITY_PERSIST_INTERVAL_MS
    ) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      lastPersistedActivityRef.current = now;
    }
  });

  const expireSession = useEffectEvent(() => {
    if (hasExpiredRef.current) {
      return;
    }

    hasExpiredRef.current = true;
    window.localStorage.setItem(SESSION_EXPIRED_KEY, String(Date.now()));
    setSessionExpired(true);
  });

  async function handleSignInAgain() {
    if (redirectingToSignIn) {
      return;
    }

    setRedirectingToSignIn(true);
    window.localStorage.removeItem(SESSION_EXPIRED_KEY);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);

    try {
      await authClient.signOut();
    } finally {
      router.replace("/");
    }
  }

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    const hasStoredExpiration = Boolean(
      window.localStorage.getItem(SESSION_EXPIRED_KEY)
    );

    if (hasStoredExpiration) {
      hasExpiredRef.current = true;
      setSessionExpired(true);
      return;
    }

    hasExpiredRef.current = false;
    setSessionExpired(false);
    setRedirectingToSignIn(false);

    const storedActivity = parseTimestamp(
      window.localStorage.getItem(LAST_ACTIVITY_KEY)
    );
    const initialActivity = storedActivity ?? Date.now();

    lastActivityRef.current = initialActivity;
    lastPersistedActivityRef.current = initialActivity;
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(initialActivity));

    const handleActivity = () => persistActivity();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        persistActivity(true);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_EXPIRED_KEY && event.newValue) {
        hasExpiredRef.current = true;
        setSessionExpired(true);
        return;
      }

      if (event.key !== LAST_ACTIVITY_KEY) {
        return;
      }

      const nextActivity = parseTimestamp(event.newValue);
      if (nextActivity) {
        lastActivityRef.current = nextActivity;
        lastPersistedActivityRef.current = nextActivity;
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    persistActivity(true);

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        expireSession();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isPending, session, sessionExpired]);

  return (
    <Dialog open={sessionExpired} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md rounded-3xl border border-border/60 bg-background/95 p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/90"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="gap-2">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Session Expired
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            <span className="block">Your session has expired due to inactivity.</span>
            <span className="block">Please sign in again to continue.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 sm:justify-start">
          <Button
            className="w-full rounded-xl sm:w-auto"
            onClick={() => {
              void handleSignInAgain();
            }}
            disabled={redirectingToSignIn}
          >
            {redirectingToSignIn ? "Redirecting..." : "Sign In Again"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
