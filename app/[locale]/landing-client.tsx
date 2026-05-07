"use client";

import Link from "next/link";
import { Anchor, Shield, Swords, Trophy } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { ProUpgradeModal } from "@/components/pro-upgrade-modal";
import { Locale } from "@/lib/i18n";

export function LandingClient({ locale, t }: { locale: Locale; t: any }) {
  return (
    <main style={{
      background: "radial-gradient(ellipse at 20% 15%, #0D1A22 0%, #1C1814 55%, #130E0A 100%)",
      minHeight: "100vh",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(10,92,107,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Hero */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 20px 40px", display: "grid", gap: "40px" }}
        className="md:grid-cols-[1.2fr_0.8fr]">
        <div>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "5px 14px",
            background: "rgba(10,92,107,0.15)",
            border: "1px solid rgba(15,122,138,0.3)",
            borderRadius: "4px",
            marginBottom: "20px",
          }}>
            <Anchor style={{ width: "11px", height: "11px", color: "#0F7A8A" }} />
            <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#1AAFBF" }}>
              {t.landing.badge}
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 6vw, 64px)",
            fontWeight: 800, lineHeight: 1.05,
            color: "#D4B78F",
            letterSpacing: "-0.01em",
            marginBottom: "16px",
          }}>
            {t.landing.title}
          </h1>

          <p style={{ fontSize: "15px", color: "#8A7A6A", lineHeight: 1.6, maxWidth: "520px", marginBottom: "28px" }}>
            {t.landing.subtitle}
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "28px" }}>
            <Link href={`/${locale}/game`} style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
              border: "none", borderRadius: "6px",
              color: "#F5EDE0",
              fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.12em",
              fontSize: "12px", textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(15,122,138,0.3)",
            }}>
              {t.landing.primaryCta}
            </Link>
            <Link href={`/${locale}/game`} style={{
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid rgba(63,50,40,0.9)",
              borderRadius: "6px",
              color: "#8A7A6A",
              fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em",
              fontSize: "12px", textTransform: "uppercase",
              textDecoration: "none",
            }}>
              {t.landing.secondaryCta}
            </Link>
            <Link href={`/${locale}/game?createRoom=1`} style={{
              padding: "12px 24px",
              background: "rgba(44,36,27,0.8)",
              border: "1px solid rgba(212,183,143,0.15)",
              borderRadius: "6px",
              color: "#D4B78F",
              fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em",
              fontSize: "12px", textTransform: "uppercase",
              textDecoration: "none",
            }}>
              {t.landing.friendCta}
            </Link>
          </div>

          {/* Auth invite */}
          <div style={{
            padding: "14px 18px",
            background: "rgba(44,36,27,0.7)",
            border: "1px solid rgba(212,183,143,0.1)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: "13px", color: "#D4B78F", fontFamily: "monospace" }}>Сохраняйте прогресс</p>
              <p style={{ fontSize: "11px", color: "#9A8A68", marginTop: "2px" }}>Войдите для статистики и рейтингов</p>
            </div>
            <AuthButton />
          </div>
        </div>

        {/* Stats card */}
        <div style={{
          background: "rgba(44,36,27,0.7)",
          border: "1px solid rgba(212,183,143,0.1)",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "inset 0 1px 0 rgba(212,183,143,0.06)",
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          {t.landing.stats.map((stat: any) => (
            <div key={stat.title} style={{
              padding: "12px 16px",
              background: "rgba(28,24,20,0.8)",
              border: "1px solid rgba(63,50,40,0.7)",
              borderRadius: "7px",
            }}>
              <p style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#9A8A68", marginBottom: "4px" }}>
                {stat.title}
              </p>
              <p style={{ fontSize: "26px", fontWeight: 800, fontFamily: "monospace", color: "#E8C97F", lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 40px", display: "grid", gap: "12px" }}
        className="md:grid-cols-3">
        {t.landing.features.map((feature: any, i: number) => {
          const Icon = [Swords, Shield, Trophy][i];
          return (
            <article key={feature.title} style={{
              padding: "20px",
              background: "rgba(44,36,27,0.6)",
              border: "1px solid rgba(212,183,143,0.08)",
              borderRadius: "10px",
            }}>
              <Icon style={{ width: "16px", height: "16px", color: "#0F7A8A", marginBottom: "10px" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#D4B78F", marginBottom: "6px" }}>{feature.title}</h3>
              <p style={{ fontSize: "13px", color: "#9A8A68", lineHeight: 1.5 }}>{feature.text}</p>
            </article>
          );
        })}
      </section>

      {/* Pro banner */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 60px" }}>
        <div style={{
          padding: "28px",
          background: "linear-gradient(135deg, rgba(44,36,27,0.9), rgba(10,92,107,0.15))",
          border: "1px solid rgba(15,122,138,0.2)",
          borderRadius: "12px",
          boxShadow: "0 0 40px rgba(10,92,107,0.1)",
        }}>
          <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#1AAFBF", marginBottom: "8px" }}>
            {t.landing.proTitle}
          </p>
          <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: "#D4B78F", marginBottom: "10px" }}>
            {t.landing.proCta}
          </h2>
          <p style={{ fontSize: "13px", color: "#9A8A68", maxWidth: "600px", lineHeight: 1.6, marginBottom: "16px" }}>
            {t.landing.proText}
          </p>
          <ProUpgradeModal label={t.landing.proCta} />
        </div>
      </section>
    </main>
  );
}
