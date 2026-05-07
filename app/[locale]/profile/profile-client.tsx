"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, User } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { KAZAKH_CITIES, LocalProfile, getProfile, setCity, syncToSupabase } from "@/lib/profile-service";

type RemoteProfile = {
  id: string; username: string; full_name: string | null;
  city: string | null; elo: number;
  games_played: number | null; matches: number | null;
  wins: number; losses: number; accuracy: number;
};

const DEFAULT_PROFILE: LocalProfile = {
  id: "", username: "Guest Captain", city: "", elo: 1000,
  wins: 0, losses: 0, matches: 0, accuracy: 0, history: [],
};

const panelStyle: React.CSSProperties = {
  background: "rgba(44,36,27,0.92)",
  border: "1px solid rgba(212,183,143,0.1)",
  borderRadius: "10px",
  boxShadow: "inset 0 1px 0 rgba(212,183,143,0.06), 0 4px 20px rgba(0,0,0,0.4)",
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
    const local = getProfile();
    setProfile(local);
    setCityInput(local.city || "");

    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { setIsAuthenticated(false); return null; }
        setIsAuthenticated(true);
        return r.json();
      })
      .then((data: { remote: RemoteProfile | null } | null) => {
        if (cancelled || !data?.remote) return;
        const r = data.remote;
        setProfile((prev) => ({
          ...prev,
          username: r.username ?? prev.username,
          city: r.city ?? prev.city,
          elo: r.elo, wins: r.wins, losses: r.losses,
          matches: r.matches ?? r.games_played ?? prev.matches,
          accuracy: typeof r.accuracy === "number" ? r.accuracy : Number(r.accuracy),
        }));
        setCityInput(r.city ?? local.city ?? "");
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const handleSaveCity = async () => {
    const val = cityInput === "other" ? customCity.trim() : cityInput;
    if (!val) return;
    setSavingCity(true);
    try { const updated = await setCity(val); setProfile(updated); } finally { setSavingCity(false); }
  };

  const handleManualSync = async () => {
    setSyncing(true); setSyncStatus("idle"); setSyncError(null);
    const result = await syncToSupabase(getProfile());
    setSyncing(false);
    setSyncStatus(result.ok ? "ok" : "error");
    setSyncError(result.ok ? null : (result.error ?? "unknown"));
    setTimeout(() => setSyncStatus("idle"), 5000);
  };

  const winrate = profile.matches > 0 ? Math.round((profile.wins / profile.matches) * 100) : 0;

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px", position: "relative" }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          paddingTop: "80px", gap: "8px",
          background: "rgba(28,24,20,0.7)", borderRadius: "10px", backdropFilter: "blur(4px)",
        }}>
          <Loader2 style={{ width: "18px", height: "18px", color: "#0F7A8A", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#B0A080" }}>ЗАГРУЗКА ДОСЬЕ…</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(15,122,138,0.15)", border: "1px solid rgba(15,122,138,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User style={{ width: "16px", height: "16px", color: "#0F7A8A" }} />
          </div>
          <div>
            <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#9A8A68" }}>ПРОФИЛЬ</p>
            <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#D4B78F", lineHeight: 1 }}>{profile.username}</h1>
          </div>
        </div>
        <AuthButton />
      </div>

      {!isAuthenticated && !loading && (
        <div style={{ ...panelStyle, padding: "12px 16px", marginBottom: "14px", background: "rgba(139,34,34,0.1)", border: "1px solid rgba(255,77,77,0.15)" }}>
          <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#FF8A8A" }}>Войдите для синхронизации статистики и участия в рейтингах</p>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "14px" }}>
        {[
          { label: "ELO РЕЙТИНГ", value: profile.elo, color: "#E8C97F" },
          { label: "ПОБЕД", value: `${winrate}%`, color: "#0F7A8A" },
          { label: "В/П", value: `${profile.wins}/${profile.matches}`, color: "#D4B78F" },
          { label: "ТОЧНОСТЬ", value: `${profile.accuracy}%`, color: "#A8B5C0" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...panelStyle, padding: "12px" }}>
            <p style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#9A8A68", marginBottom: "4px" }}>{label}</p>
            <p style={{ fontSize: "22px", fontWeight: 800, fontFamily: "monospace", color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* City */}
      <div style={{ ...panelStyle, padding: "14px", marginBottom: "10px" }}>
        <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#9A8A68", marginBottom: "10px" }}>
          ДИСЛОКАЦИЯ
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", background: "#1A150F", border: "1px solid rgba(63,50,40,0.9)", borderRadius: "6px", color: "#F5EDE0", fontSize: "12px", outline: "none" }}
          >
            <option value="">— Не выбрана —</option>
            {KAZAKH_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="other">Другой город</option>
          </select>
          {cityInput === "other" && (
            <input value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="Введите город"
              style={{ flex: 1, padding: "8px 10px", background: "#1A150F", border: "1px solid rgba(63,50,40,0.9)", borderRadius: "6px", color: "#F5EDE0", fontSize: "12px", outline: "none" }} />
          )}
          <button onClick={handleSaveCity} disabled={cityLoading || !cityInput} style={{
            display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px",
            background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
            border: "none", borderRadius: "6px",
            color: "#F5EDE0", fontFamily: "monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
            cursor: "pointer", opacity: (!cityInput || cityLoading) ? 0.5 : 1,
          }}>
            {cityLoading && <Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} />}
            СОХРАНИТЬ
          </button>
        </div>
        {profile.city && <p style={{ marginTop: "6px", fontSize: "10px", fontFamily: "monospace", color: "#9A8A68" }}>Текущая: <span style={{ color: "#D4B78F" }}>{profile.city}</span></p>}
      </div>

      {/* Sync */}
      {isAuthenticated && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <button onClick={handleManualSync} disabled={syncing} style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 12px",
            background: "transparent", border: "1px solid rgba(63,50,40,0.8)", borderRadius: "6px",
            color: "#B0A080", fontFamily: "monospace", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
            cursor: "pointer", opacity: syncing ? 0.6 : 1,
          }}>
            <RefreshCw style={{ width: "11px", height: "11px", color: "#0F7A8A", animation: syncing ? "spin 1s linear infinite" : "none" }} />
            СИНХРОНИЗИРОВАТЬ
          </button>
          {syncStatus === "ok" && <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#0F7A8A" }}>✓ СИНХРОНИЗИРОВАНО</span>}
          {syncStatus === "error" && <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#FF8A8A" }}>ОШИБКА: {syncError}</span>}
        </div>
      )}

      {/* History */}
      <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em", color: "#9A8A68", marginBottom: "8px" }}>
        ЖУРНАЛ БОЁВ
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {profile.history.length === 0 && !loading && (
          <div style={{ ...panelStyle, padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#9A8A68" }}>Журнал пуст — примите бой</p>
          </div>
        )}
        {profile.history.map((item, idx) => (
          <article key={`${item.createdAt}-${idx}`} style={{ ...panelStyle, padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                padding: "2px 8px", borderRadius: "3px",
                fontFamily: "monospace", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em",
                ...(item.won
                  ? { background: "rgba(15,122,138,0.2)", color: "#0F7A8A", border: "1px solid rgba(15,122,138,0.3)" }
                  : { background: "rgba(139,34,34,0.2)", color: "#FF8A8A", border: "1px solid rgba(255,77,77,0.25)" }
                ),
              }}>
                {item.won ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}
              </span>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#B0A080" }}>{item.mode}</span>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#D4B78F", marginLeft: "auto" }}>точность {item.accuracy}%</span>
            </div>
            <p style={{ marginTop: "4px", fontSize: "11px", color: "#B0A080" }}>{item.summary}</p>
          </article>
        ))}
      </div>
    </main>
  );
};
