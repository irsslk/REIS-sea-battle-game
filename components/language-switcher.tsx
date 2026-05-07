"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, Locale } from "@/lib/i18n";

export const LanguageSwitcher = ({ currentLocale }: { currentLocale: Locale }) => {
  const pathname = usePathname();

  const getLocalePath = (target: string) => {
    const segs = pathname.split("/");
    segs[1] = target;
    return segs.join("/") || "/";
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "2px",
      padding: "3px",
      background: "rgba(28,24,20,0.8)",
      border: "1px solid rgba(63,50,40,0.8)",
      borderRadius: "6px",
    }}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={getLocalePath(locale)}
          style={{
            padding: "3px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textDecoration: "none",
            transition: "all 0.15s",
            ...(locale === currentLocale
              ? { background: "rgba(15,122,138,0.25)", color: "#0F7A8A", border: "1px solid rgba(15,122,138,0.4)" }
              : { color: "#8A7A6A", border: "1px solid transparent" }
            ),
          }}
        >
          {localeLabels[locale]}
        </Link>
      ))}
    </div>
  );
};
