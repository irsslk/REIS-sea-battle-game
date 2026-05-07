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
    <div className="flex items-center gap-0.5 rounded-full border border-[#C9AA88] bg-[#F0E6D8] p-0.5">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={getLocalePath(locale)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            locale === currentLocale
              ? "bg-[#8B5A2B] text-[#F5EDE4]"
              : "text-[#6B4C30] hover:bg-[#8B5A2B]/20"
          }`}
        >
          {localeLabels[locale]}
        </Link>
      ))}
    </div>
  );
};
