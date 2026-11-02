"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSwitch() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Switch
      id="dark-mode"
      aria-describedby="dark-mode-description"
      checked={mounted && resolvedTheme === "dark"}
      disabled={!mounted}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
    />
  );
}
