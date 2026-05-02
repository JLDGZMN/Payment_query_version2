"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

const AUTH_FLASH_KEY = "auth-flash";
const AUTH_FLASH_USERNAME_KEY = "auth-flash-username";

export function AuthFlashToast() {
  const pathname = usePathname();

  useEffect(() => {
    const flash = window.sessionStorage.getItem(AUTH_FLASH_KEY);
    const flashUsername = window.sessionStorage
      .getItem(AUTH_FLASH_USERNAME_KEY)
      ?.trim();

    if (!flash) {
      return;
    }

    if (flash === "login-success" && pathname.startsWith("/dashboard")) {
      const formattedUsername = flashUsername?.toUpperCase();

      toast.success(
        formattedUsername
          ? `Login successful. Welcome back, ${formattedUsername}!`
          : "Login successful, good to have you back."
      );
      window.sessionStorage.removeItem(AUTH_FLASH_KEY);
      window.sessionStorage.removeItem(AUTH_FLASH_USERNAME_KEY);
    }

    if (flash === "logout-success" && pathname === "/") {
      toast.success("You have been logged out.");
      window.sessionStorage.removeItem(AUTH_FLASH_KEY);
      window.sessionStorage.removeItem(AUTH_FLASH_USERNAME_KEY);
    }

  }, [pathname]);

  return null;
}
