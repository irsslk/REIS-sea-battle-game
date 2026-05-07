"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "ottoman" | "steppe";

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    return (localStorage.getItem("reis-theme") as Theme | null) ?? "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const apply = (next: Theme) => {
    setTheme(next);
    localStorage.setItem("reis-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1">
      {(["dark", "ottoman", "steppe"] as Theme[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => apply(item)}
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
            theme === item ? "bg-emerald-300 text-slate-900" : "text-slate-200"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
