import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, User, Anchor } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { isLocale, Locale } from "@/lib/i18n";
import { messages } from "@/lib/messages";

export const metadata: Metadata = {
  title: "REIS - Sea Battle",
  description: "Modern sea battle for CIS and Asia.",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = messages[locale as Locale];

  return (
    <div className="min-h-screen bg-[#F5EDE4] text-[#2C1A0E]">
      <header className="sticky top-0 z-20 border-b border-[#C9AA88] bg-[#F0E6D8]/95 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-extrabold tracking-wide text-[#8B5A2B]">
            <Anchor className="h-5 w-5" />
            REIS
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeSwitcher />
            <PwaInstallButton />
            <AuthButton />
            <Link
              href={`/${locale}/leaderboards`}
              className="inline-flex items-center gap-1 rounded-full border border-[#C9AA88] px-3 py-1.5 text-xs font-semibold text-[#6B4C30] transition hover:bg-[#8B5A2B]/10"
            >
              <Trophy className="h-3.5 w-3.5 text-[#8B5A2B]" />
              Leaderboard
            </Link>
            <Link
              href={`/${locale}/profile`}
              className="inline-flex items-center gap-1 rounded-full border border-[#C9AA88] px-3 py-1.5 text-xs font-semibold text-[#6B4C30] transition hover:bg-[#8B5A2B]/10"
            >
              <User className="h-3.5 w-3.5 text-[#8B5A2B]" />
              Профиль
            </Link>
            <Link
              href={`/${locale}/game`}
              className="rounded-full bg-[#8B5A2B] px-4 py-1.5 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] shadow-sm"
            >
              {t.navPlay}
            </Link>
          </div>
        </div>
      </header>
      <PwaRegistrar />
      {children}
    </div>
  );
}
