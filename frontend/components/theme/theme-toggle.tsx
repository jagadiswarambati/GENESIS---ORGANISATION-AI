"use client";

import { icons } from "@/lib/icons";

import { Button } from "../design-system/button";
import { type Theme, useTheme } from "./theme-provider";

const themeCycle: Record<Theme, Theme> = { dark: "light", light: "system", system: "dark" };

export function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const Icon = resolvedTheme === "dark" ? icons.themeLight : icons.themeDark;
  const nextTheme = themeCycle[theme];

  return (
    <Button
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
      size="icon"
      variant="ghost"
    >
      <Icon aria-hidden="true" size={16} />
    </Button>
  );
}
