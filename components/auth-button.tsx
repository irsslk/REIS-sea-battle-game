"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { createClient } from "@/supabase/client";
import { getProfile, syncToSupabase } from "@/lib/profile-service";
import { AuthModal } from "@/components/auth-modal";

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "5px",
  padding: "5px 10px",
  fontFamily: "monospace", fontSize: "11px", fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase" as const,
  borderRadius: "5px", cursor: "pointer", border: "none",
  transition: "all 0.15s",
};

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  const syncLocalProgress = async () => {
    setSyncing(true);
    try { await syncToSupabase(getProfile()); } catch {}
    finally { setSyncing(false); }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { setUser(user); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const prev = user;
      const current = session?.user ?? null;
      setUser(current);
      if (event === "SIGNED_IN" && current && !prev) setTimeout(syncLocalProgress, 500);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div style={{ ...btnBase, background: "rgba(28,24,20,0.8)", border: "1px solid rgba(63,50,40,0.8)", color: "#6A5A4A" }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3F3228", animation: "pulse 1s infinite" }} />
      …
    </div>
  );

  if (user) return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ ...btnBase, background: "rgba(15,122,138,0.15)", border: "1px solid rgba(15,122,138,0.3)", color: "#0F7A8A", cursor: "default" }}>
        <User style={{ width: "10px", height: "10px" }} />
        {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "ОФИЦЕР"}
        {syncing && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#0F7A8A" }} />}
      </div>
      <button onClick={() => supabase.auth.signOut()} style={{ ...btnBase, background: "transparent", border: "1px solid rgba(63,50,40,0.8)", color: "#8A7A6A" }}>
        <LogOut style={{ width: "10px", height: "10px" }} />
        Выход
      </button>
    </div>
  );

  return (
    <>
      <button onClick={() => setShowModal(true)} style={{ ...btnBase, background: "linear-gradient(135deg, #0A5C6B, #0F7A8A)", color: "#F5EDE0", boxShadow: "0 0 10px rgba(15,122,138,0.25)" }}>
        <LogIn style={{ width: "10px", height: "10px" }} />
        Войти
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
