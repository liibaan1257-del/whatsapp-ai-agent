"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { THEME_KEY, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const EVENT = "themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/** Two buttons: light and dark. Remembered on this device. */
export function ThemeToggle({ className }: { className?: string }) {
  const { m } = useI18n();
  // null on the server: no button looks selected until the browser knows the theme.
  const theme = useSyncExternalStore(subscribe, current, () => null);

  function choose(next: Theme) {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode: still switch for this page.
    }
    document.documentElement.classList.toggle("dark", next === "dark");
    window.dispatchEvent(new Event(EVENT));
  }

  const options = [
    { value: "light" as const, label: m.common.light, Icon: Sun },
    { value: "dark" as const, label: m.common.dark, Icon: Moon },
  ];
  return (
    <div role="group" aria-label={m.common.theme} className={cn("grid grid-cols-2 gap-1 rounded-md border p-0.5", className)}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => choose(value)}
          className={cn(
            "flex h-7 items-center justify-center gap-1.5 rounded px-2 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            theme === value ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
