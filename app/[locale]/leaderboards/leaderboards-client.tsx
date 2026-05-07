"use client";

import { useEffect, useState } from "react";
import { Loader2, Medal, Trophy } from "lucide-react";
import { AuthButton } from "@/components/auth-button";

type Tab = "global" | "almaty" | "astana" | "shymkent" | "other";

const tabLabel: Record<Tab, string> = {
  global: "Глобальный",
  almaty: "Алматы",
  astana: "Астана",
  shymkent: "Шымкент",
  other: "Другие города",
};

const medalColor = ["text-[#E8B923]", "text-[#9E9E9E]", "text-[#C8762B]"];

export const LeaderboardsClient = () => {
  const [tab, setTab] = useState<Tab>("global");
  const [rows, setRows] = useState<Array<{ name: string; city: string; elo: number; wins: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => setIsAuthenticated(r.status !== 401))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const cityParam =
        tab === "almaty" ? "Алматы" :
        tab === "astana" ? "Астана" :
        tab === "shymkent" ? "Шымкент" :
        tab === "other" ? "Other" : "";
      const r = await fetch(`/api/leaderboards${cityParam ? `?city=${encodeURIComponent(cityParam)}` : ""}`, { cache: "no-store" });
      const json = await r.json();
      setRows(
        tab === "other"
          ? (json.rows ?? []).filter((r: { city: string }) => !["Алматы","Астана","Шымкент"].includes(r.city))
          : (json.rows ?? [])
      );
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [tab]);

  return (
    <main className="mx-auto w-full max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-[#8B5A2B]" />
          <h1 className="text-2xl font-extrabold text-[#2C1A0E]">Лидерборд</h1>
        </div>
        <AuthButton />
      </div>

      {!isAuthenticated && (
        <div className="mb-4 rounded-xl border border-[#C9AA88] bg-[#8B5A2B]/10 p-4">
          <p className="text-sm text-[#5A3A1A]">Войдите в аккаунт, чтобы попасть в таблицу лидеров</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(tabLabel) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === key
                ? "bg-[#8B5A2B] text-[#F5EDE4] shadow-sm"
                : "border border-[#C9AA88] bg-[#F0E6D8] text-[#6B4C30] hover:bg-[#E8D5BB]"
            }`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="relative min-h-[200px] space-y-2">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#F0E6D8]/80 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-[#8B5A2B]" />
            <p className="text-sm text-[#8B6B4A]">Загрузка таблицы…</p>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#C9AA88] bg-[#F0E6D8] p-8 text-center">
            <p className="text-sm text-[#9E7B5A]">Пока нет игроков — станьте первым!</p>
          </div>
        )}

        {rows.map((row, i) => (
          <article
            key={`${row.name}-${i}`}
            className="flex items-center justify-between rounded-xl border border-[#C9AA88] bg-[#F0E6D8] p-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-extrabold text-[#8B5A2B]">{i + 1}</span>
              {i < 3 && <Medal className={`h-5 w-5 ${medalColor[i]}`} />}
              <div>
                <p className="font-bold text-[#2C1A0E]">{row.name}</p>
                <p className="text-xs text-[#9E7B5A]">{row.city}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-[#8B5A2B]">{row.elo} Elo</p>
              <p className="text-xs text-[#9E7B5A]">{row.wins} побед</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};
