"use client";

import Link from "next/link";
import { Anchor, Sparkles, Trophy, Users } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { ProUpgradeModal } from "@/components/pro-upgrade-modal";
import { Locale } from "@/lib/i18n";

interface LandingClientProps {
  locale: Locale;
  t: any;
}

export function LandingClient({ locale, t }: LandingClientProps) {
  return (
    <main className="relative overflow-hidden">
      {/* Decorative warm glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#E8B923]/20 blur-3xl" />

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9AA88] bg-[#F0E6D8] px-4 py-1.5 text-sm font-semibold text-[#8B5A2B]">
            <Anchor className="h-3.5 w-3.5" />
            {t.landing.badge}
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-[#2C1A0E] md:text-6xl">{t.landing.title}</h1>
          <p className="max-w-2xl text-base text-[#6B4C30] md:text-lg">{t.landing.subtitle}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/game`} className="rounded-full bg-[#8B5A2B] px-6 py-3 font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] shadow-md">
              {t.landing.primaryCta}
            </Link>
            <Link href={`/${locale}/game`} className="rounded-full border border-[#C9AA88] bg-[#F0E6D8] px-6 py-3 font-semibold text-[#5A3A1A] transition hover:bg-[#E8D5BB]">
              {t.landing.secondaryCta}
            </Link>
            <Link href={`/${locale}/game?createRoom=1`} className="rounded-full border border-[#8B5A2B]/40 bg-[#8B5A2B]/10 px-6 py-3 font-semibold text-[#5A3A1A] transition hover:bg-[#8B5A2B]/20">
              {t.landing.friendCta}
            </Link>
          </div>

          {/* Sign in card */}
          <div className="rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#2C1A0E]">Сохраняйте прогресс</h3>
                <p className="mt-1 text-sm text-[#8B6B4A]">Войдите и участвуйте в лидерборде</p>
              </div>
              <AuthButton />
            </div>
          </div>

          <p className="text-sm text-[#9E7B5A]">{t.landing.socialProof}</p>
        </div>

        {/* Stats card */}
        <div className="rounded-3xl border border-[#C9AA88] bg-[#F0E6D8] p-5 shadow-lg">
          <div className="grid gap-3">
            {t.landing.stats.map((stat: any) => (
              <article key={stat.title} className="rounded-2xl border border-[#C9AA88] bg-[#F8F1E9] px-4 py-3">
                <p className="text-xs font-semibold text-[#9E7B5A]">{stat.title}</p>
                <p className="mt-1 text-2xl font-extrabold text-[#8B5A2B]">{stat.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-14 md:grid-cols-3">
        {t.landing.features.map((feature: any, index: number) => {
          const Icon = [Sparkles, Users, Trophy][index];
          return (
            <article key={feature.title} className="rounded-3xl border border-[#C9AA88] bg-[#F0E6D8] p-5 shadow-md">
              <Icon className="mb-3 h-5 w-5 text-[#8B5A2B]" />
              <h3 className="text-lg font-bold text-[#2C1A0E]">{feature.title}</h3>
              <p className="mt-2 text-sm text-[#6B4C30]">{feature.text}</p>
            </article>
          );
        })}
      </section>

      {/* Pro banner */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-[#C9AA88] bg-gradient-to-r from-[#F0E6D8] to-[#E8D5BB] p-6 md:p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8B923]">{t.landing.proTitle}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[#2C1A0E] md:text-3xl">{t.landing.proCta}</h2>
          <p className="mt-3 max-w-3xl text-sm text-[#6B4C30] md:text-base">{t.landing.proText}</p>
          <ProUpgradeModal label={t.landing.proCta} />
        </div>
      </section>
    </main>
  );
}
