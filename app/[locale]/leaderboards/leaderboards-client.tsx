"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { AuthButton } from "@/components/auth-button";

type Tab = "global" | "almaty" | "astana" | "shymkent" | "other";

const tabLabel: Record<Tab, string> = {
  global: "ГЛОБАЛЬНЫЙ", almaty: "АЛМАТЫ", astana: "АСТАНА",
  shymkent: "ШЫМКЕНТ", other: "ДРУГИЕ",
};

const panelStyle: React.CSSProperties = {
  background: "rgba(44,36,27,0.92)",
  border: "1px solid rgba(212,183,143,0.1)",
  borderRadius: "8px",
  boxShadow: "inset 0 1px 0 rgba(212,183,143,0.05)",
};

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
        tab === "almaty" ? "Алматы" : tab === "astana" ? "Астана" :
        tab === "shymkent" ? "Шымкент" : tab === "other" ? "Other" : "";
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

  const medalColor = ["#E8C97F", "#A8B5C0", "#CD7F32"];

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Trophy style={{ width: "18px", height: "18px", color: "#E8C97F" }} />
          <div>
            <p style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.25em", color: "#9A8A68" }}>КОМАНДНАЯ ДОСКА</p>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#D4B78F", lineHeight: 1 }}>Лидерборд</h1>
          </div>
        </div>
        <AuthButton />
      </div>

      {!isAuthenticated && (
        <div style={{ ...panelStyle, padding: "10px 14px", marginBottom: "14px", background: "rgba(10,92,107,0.1)", border: "1px solid rgba(15,122,138,0.2)" }}>
          <p style={{ fontSize: "10px", fontFamily: "monospace", color: "#7AC8D8" }}>Войдите для участия в рейтинге</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {(Object.keys(tabLabel) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: "5px 12px",
              fontFamily: "monospace", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              borderRadius: "5px", cursor: "pointer", border: "none",
              ...(tab === key
                ? { background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)", color: "#F5EDE0", boxShadow: "0 0 10px rgba(15,122,138,0.3)" }
                : { background: "rgba(28,24,20,0.8)", border: "1px solid rgba(63,50,40,0.8)", color: "#B0A080" }
              ),
            }}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ position: "relative", minHeight: "200px", display: "flex", flexDirection: "column", gap: "5px" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
            background: "rgba(28,24,20,0.8)", borderRadius: "8px", backdropFilter: "blur(4px)",
          }}>
            <Loader2 style={{ width: "20px", height: "20px", color: "#0F7A8A", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "10px", fontFamily: "monospace", color: "#9A8A68" }}>ЗАГРУЗКА ДАННЫХ…</p>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ ...panelStyle, padding: "24px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#9A8A68" }}>Нет данных — станьте первым</p>
          </div>
        )}

        {rows.map((row, i) => (
          <article key={`${row.name}-${i}`} style={{
            ...panelStyle,
            padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            ...(i === 0 ? { border: "1px solid rgba(232,201,127,0.25)", boxShadow: "inset 0 1px 0 rgba(232,201,127,0.08), 0 0 20px rgba(232,201,127,0.05)" } : {}),
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{
                width: "22px", textAlign: "center",
                fontFamily: "monospace", fontWeight: 800, fontSize: "13px",
                color: i < 3 ? medalColor[i] : "#6A5A4A",
              }}>
                {i + 1}
              </span>
              {i < 3 && (
                <Trophy style={{ width: "14px", height: "14px", color: medalColor[i] }} />
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: "13px", color: "#D4B78F", fontFamily: "monospace" }}>{row.name}</p>
                <p style={{ fontSize: "10px", color: "#9A8A68", fontFamily: "monospace" }}>{row.city}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 800, fontSize: "14px", fontFamily: "monospace", color: "#E8C97F" }}>{row.elo}</p>
              <p style={{ fontSize: "11px", color: "#9A8A68", fontFamily: "monospace", letterSpacing: "0.1em" }}>{row.wins} ПОБЕД</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};
