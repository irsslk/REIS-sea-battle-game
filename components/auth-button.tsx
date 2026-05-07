"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { createClient } from "@/supabase/client";
import { getProfile, syncToSupabase } from "@/lib/profile-service";
import { AuthModal } from "@/components/auth-modal";

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const prev = user;
      const current = session?.user ?? null;
      setUser(current);
      if (event === "SIGNED_IN" && current && !prev) {
        setTimeout(syncLocalProgress, 500);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-[#C9AA88] bg-[#F0E6D8] px-3 py-1.5 text-xs font-semibold text-[#8B6B4A]">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[#C9AA88]" />
        …
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5A2B]/40 bg-[#8B5A2B]/10 px-3 py-1.5 text-xs font-semibold text-[#5A3A1A]">
          <User className="h-3.5 w-3.5 text-[#8B5A2B]" />
          {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "User"}
          {syncing && <span className="h-2 w-2 animate-pulse rounded-full bg-[#8B5A2B]" />}
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1 rounded-full border border-[#C9AA88] px-3 py-1.5 text-xs font-semibold text-[#6B4C30] transition hover:bg-[#8B5A2B]/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Выйти
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5A2B] px-3 py-1.5 text-xs font-bold text-[#F5EDE4] transition hover:bg-[#6B4020]"
      >
        <LogIn className="h-3.5 w-3.5" />
        Войти
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
