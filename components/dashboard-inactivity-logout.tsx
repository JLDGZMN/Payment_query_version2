"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";

const AUTH_FLASH_KEY = "auth-flash";
const AUTH_FLASH_USERNAME_KEY = "auth-flash-username";
const LAST_ACTIVITY_KEY = "dashboard-last-activity";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
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
  const lastActivityRef = useRef(Date.now());
  const lastPersistedActivityRef = useRef(0);
  const hasLoggedOutRef = useRef(false);

  const persistActivity = useEffectEvent((force = false) => {
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

  const logoutForInactivity = useEffectEvent(async () => {
    if (hasLoggedOutRef.current) {
      return;
    }

    hasLoggedOutRef.current = true;
    window.sessionStorage.setItem(AUTH_FLASH_KEY, "logout-timeout");
    window.sessionStorage.removeItem(AUTH_FLASH_USERNAME_KEY);

    try {
      await authClient.signOut();
    } finally {
      router.replace("/");
    }
  });

  useEffect(() => {
    if (isPending || !session) {
      return;
    }

    hasLoggedOutRef.current = false;

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
        void logoutForInactivity();
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
  }, [isPending, session]);

  return null;
}
