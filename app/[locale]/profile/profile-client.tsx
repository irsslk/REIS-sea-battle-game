"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { KAZAKH_CITIES, LocalProfile, getProfile, setCity, syncToSupabase } from "@/lib/profile-service";

type RemoteProfile = {
  id: string;
  username: string;
  full_name: string | null;
  city: string | null;
  elo: number;
  games_played: number | null;
  matches: number | null;
  wins: number;
  losses: number;
  accuracy: number;
};

// Fixed defaults — same on server and client, avoids hydration mismatch.
// Real values are loaded from localStorage in useEffect (client-only).
const DEFAULT_PROFILE: LocalProfile = {
  id: "",
  username: "Guest Captain",
  city: "",
  elo: 1000,
  wins: 0,
  losses: 0,
  matches: 0,
  accuracy: 0,
  history: [],
};

export const ProfileClient = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [cityInput, setCityInput] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [cityLoading, setSavingCity] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "ok" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Hydrate from localStorage (client-only)
    const local = getProfile();
    setProfile(local);
    setCityInput(local.city || "");

    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        setIsAuthenticated(true);
        return r.json();
      })
      .then((data: { remote: RemoteProfile | null } | null) => {
        if (cancelled || !data) return;
        if (data.remote) {
          const r = data.remote;
          setProfile((prev) => ({
            ...prev,
            username: r.username ?? prev.username,
            city: r.city ?? prev.city,
            elo: r.elo,
            wins: r.wins,
            losses: r.losses,
            matches: r.matches ?? r.games_played ?? prev.matches,
            accuracy: typeof r.accuracy === "number" ? r.accuracy : Number(r.accuracy),
          }));
          setCityInput(r.city ?? local.city ?? "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveCity = async () => {
    const value = cityInput === "other" ? customCity.trim() : cityInput;
    if (!value) return;
    setSavingCity(true);
    try {
      const updated = await setCity(value);
      setProfile(updated);
    } finally {
      setSavingCity(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus("idle");
    setSyncError(null);
    const current = getProfile();
    const result = await syncToSupabase(current);
    setSyncing(false);
    setSyncStatus(result.ok ? "ok" : "error");
    setSyncError(result.ok ? null : (result.error ?? "unknown"));
    setTimeout(() => setSyncStatus("idle"), 5000);
  };

  const winrate = profile.matches > 0 ? Math.round((profile.wins / profile.matches) * 100) : 0;
  const displayName = profile.username !== "Guest Captain" ? profile.username : null;

  return (
    <main className="relative mx-auto w-full max-w-5xl p-4">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-start justify-center gap-2 rounded-2xl bg-[#F0E6D8]/80 pt-24 backdrop-blur-sm" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B5A2B]" />
          <span className="text-sm text-[#8B6B4A]">Загрузка профиля…</span>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2C1A0E]">Профиль игрока</h1>
          {displayName && <p className="text-sm text-[#8B6B4A]">{displayName}</p>}
        </div>
        <AuthButton />
      </div>

      {!isAuthenticated && !loading && (
        <div className="mb-4 rounded-xl border border-[#C9AA88] bg-[#8B5A2B]/10 p-4">
          <p className="text-sm text-[#5A3A1A]">Войдите в аккаунт, чтобы сохранять прогресс и участвовать в лидербордах</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Elo", value: profile.elo, color: "text-[#8B5A2B]" },
          { label: "Winrate", value: `${winrate}%`, color: "text-[#2B5A8B]" },
          { label: "Победы / Матчи", value: `${profile.wins} / ${profile.matches}`, color: "text-[#2C1A0E]" },
          { label: "Точность", value: `${profile.accuracy}%`, color: "text-[#6B8B2B]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-[#C9AA88] bg-[#F0E6D8] p-4 shadow-sm">
            <p className="text-xs font-semibold text-[#9E7B5A]">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* City selector */}
      <div className="mt-4 rounded-xl border border-[#C9AA88] bg-[#F0E6D8] p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-[#5A3A1A]">Ваш город</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            className="flex-1 rounded-xl border border-[#C9AA88] bg-[#F8F1E9] px-3 py-2 text-sm text-[#2C1A0E] focus:outline-none"
          >
            <option value="">— Не выбран —</option>
            {KAZAKH_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="other">Другой город</option>
          </select>
          {cityInput === "other" && (
            <input
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Введите город"
              className="flex-1 rounded-xl border border-[#C9AA88] bg-[#F8F1E9] px-3 py-2 text-sm text-[#2C1A0E] placeholder-[#B8A080] focus:outline-none"
            />
          )}
          <button
            onClick={handleSaveCity}
            disabled={cityLoading || !cityInput}
            className="flex items-center gap-1.5 rounded-xl bg-[#8B5A2B] px-4 py-2 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] disabled:opacity-50"
          >
            {cityLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Сохранить
          </button>
        </div>
        {profile.city && (
          <p className="mt-2 text-xs text-[#9E7B5A]">Текущий: <span className="font-semibold text-[#2C1A0E]">{profile.city}</span></p>
        )}
      </div>

      {/* Manual sync */}
      {isAuthenticated && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl border border-[#C9AA88] bg-[#F0E6D8] px-3 py-1.5 text-xs font-semibold text-[#6B4C30] transition hover:bg-[#E8D5BB] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#8B5A2B] ${syncing ? "animate-spin" : ""}`} />
            Синхронизировать прогресс
          </button>
          {syncStatus === "ok" && <span className="text-xs font-semibold text-[#6B8B2B]">✓ Синхронизировано!</span>}
          {syncStatus === "error" && <span className="text-xs text-[#8B2B2B]">Ошибка: {syncError}</span>}
        </div>
      )}

      {/* Match history */}
      <h2 className="mt-6 mb-2 text-lg font-bold text-[#2C1A0E]">Последние 5 матчей</h2>
      <div className="space-y-2">
        {profile.history.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-[#C9AA88] bg-[#F0E6D8] p-5 text-center">
            <p className="text-sm text-[#9E7B5A]">Пока нет истории. Сыграйте партию — результаты появятся здесь.</p>
          </div>
        )}
        {profile.history.map((item, idx) => (
          <article key={`${item.createdAt}-${idx}`} className="rounded-xl border border-[#C9AA88] bg-[#F0E6D8] p-3 shadow-sm">
            <p className="text-sm font-semibold text-[#2C1A0E]">
              {item.mode} · {item.won ? <span className="text-[#6B8B2B]">✓ Победа</span> : <span className="text-[#8B2B2B]">✗ Поражение</span>} · точность {item.accuracy}%
            </p>
            <p className="mt-0.5 text-xs text-[#9E7B5A]">{item.summary}</p>
          </article>
        ))}
      </div>
    </main>
  );
};
