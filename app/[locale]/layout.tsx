import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, Trophy, User } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { isLocale, Locale } from "@/lib/i18n";
import { messages } from "@/lib/messages";

export const metadata: Metadata = {
  title: "REIS — Tactical Sea Battle",
  description: "Premium naval combat simulation.",
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
    <div style={{ minHeight: "100vh", background: "#1C1814", color: "#F5EDE0" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(28,24,20,0.97)",
        borderBottom: "1px solid rgba(63,50,40,0.9)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 1px 0 rgba(212,183,143,0.06), 0 4px 20px rgba(0,0,0,0.4)",
      }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5">
          <Link href={`/${locale}`} className="flex items-center gap-2 font-mono font-extrabold tracking-[0.12em] text-base" style={{ color: "#D4B78F" }}>
            <Anchor className="h-4 w-4" style={{ color: "#0F7A8A" }} />
            REIS
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeSwitcher />
            <PwaInstallButton />
            <AuthButton />
            <Link
              href={`/${locale}/leaderboards`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wide transition"
              style={{ border: "1px solid rgba(63,50,40,0.9)", color: "#D4B78F" }}
            >
              <Trophy className="h-3.5 w-3.5" style={{ color: "#0F7A8A" }} />
              Рейтинг
            </Link>
            <Link
              href={`/${locale}/profile`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wide transition"
              style={{ border: "1px solid rgba(63,50,40,0.9)", color: "#D4B78F" }}
            >
              <User className="h-3.5 w-3.5" style={{ color: "#0F7A8A" }} />
              Профиль
            </Link>
            <Link
              href={`/${locale}/game`}
              className="rounded-md px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-widest transition"
              style={{
                background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
                color: "#F5EDE0",
                boxShadow: "0 0 12px rgba(15,122,138,0.3)",
              }}
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
