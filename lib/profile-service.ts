"use client";

import { CoachReport } from "@/lib/coach-analysis";
import { calculateEloDelta } from "@/lib/elo";

export const KAZAKH_CITIES = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Караганда",
  "Актобе",
  "Тараз",
  "Павлодар",
  "Усть-Каменогорск",
] as const;

export interface MatchHistoryItem {
  mode: "bot" | "multiplayer";
  won: boolean;
  summary: string;
  accuracy: number;
  createdAt: string;
}

export interface LocalProfile {
  id: string;
  username: string;
  city: string;
  elo: number;
  wins: number;
  losses: number;
  matches: number;
  accuracy: number;
  history: MatchHistoryItem[];
}

const PROFILE_KEY = "reis-profile-v1";

const createDefaultProfile = (): LocalProfile => {
  const profile = {
    id: `guest-${Math.random().toString(36).slice(2, 10)}`,
    username: "Guest Captain",
    city: "",
    elo: 1000,
    wins: 0,
    losses: 0,
    matches: 0,
    accuracy: 0,
    history: [],
  };
  console.log("👤 Created default profile:", profile);
  return profile;
};

export const getProfile = (): LocalProfile => {
  if (typeof window === "undefined") {
    console.log("👤 Running on server, returning default profile");
    return createDefaultProfile();
  }
  
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) {
    console.log("👤 No profile found in localStorage, creating new one");
    const profile = createDefaultProfile();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    console.log("👤 Saved new profile to localStorage");
    return profile;
  }
  
  const profile = JSON.parse(raw) as LocalProfile;
  console.log("👤 Loaded profile from localStorage:", profile);
  return profile;
};

export const saveProfile = (profile: LocalProfile): void => {
  console.log("👤 Saving profile to localStorage:", profile);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  console.log("👤 Profile saved successfully");
};

/** Pushes profile + Elo + leaderboards to Supabase via cookie-authenticated Route Handler */
export const syncToSupabase = async (profile: LocalProfile): Promise<{ ok: boolean; error?: string }> => {
  console.log("🔄 Starting sync to Supabase for profile:", profile);
  
  if (typeof window === "undefined") {
    console.log("🔄 Sync aborted: running on server");
    return { ok: false, error: "server" };
  }
  
  try {
    console.log("🔄 Sending POST request to /api/profile/sync");
    const response = await fetch("/api/profile/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: profile.username,
        city: profile.city,
        elo: profile.elo,
        wins: profile.wins,
        losses: profile.losses,
        matches: profile.matches,
        accuracy: profile.accuracy,
      }),
    });

    console.log("🔄 Response status:", response.status, response.statusText);
    const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
    console.log("🔄 Response data:", data);

    if (response.status === 401) {
      console.log("🔄 User not authenticated - data saved locally only");
      return { ok: false, error: "not_authenticated" };
    }

    if (!response.ok || !data.ok) {
      const errorMsg = data.error ?? response.statusText;
      console.error("🔄 Sync failed:", errorMsg);
      return { ok: false, error: errorMsg };
    }

    console.log("🔄 Sync successful!");
    return { ok: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "network";
    console.error("🔄 Sync error:", err);
    return { ok: false, error: errorMsg };
  }
};

export const setCity = async (city: string): Promise<LocalProfile> => {
  console.log("🏙️ Setting city:", city);
  const profile = getProfile();
  console.log("🏙️ Current profile before city update:", profile);
  
  const updated = { ...profile, city };
  console.log("🏙️ Updated profile with city:", updated);
  
  saveProfile(updated);
  console.log("🏙️ City saved to localStorage");
  
  const syncResult = await syncToSupabase(updated);
  console.log("🏙️ City sync result:", syncResult);
  
  if (!syncResult.ok) {
    if (syncResult.error === "not_authenticated") {
      console.log("🏙️ City saved locally. Sign in to sync to cloud.");
    } else {
      console.error("🏙️ Failed to sync city to Supabase:", syncResult.error);
    }
  }
  
  return updated;
};

export const recordMatchResult = async ({
  won,
  accuracy,
  mode,
  coachReport,
}: {
  won: boolean;
  accuracy: number;
  mode: "bot" | "multiplayer";
  coachReport: CoachReport | null;
}): Promise<LocalProfile> => {
  console.log("🎮 Recording match result:", { won, accuracy, mode });
  
  const profile = getProfile();
  console.log("🎮 Current profile:", profile);
  
  const elo = calculateEloDelta(profile.elo, won);
  console.log("🎮 Elo calculation:", { current: profile.elo, delta: elo.delta, next: elo.nextElo });
  
  const matches = profile.matches + 1;
  const updated: LocalProfile = {
    ...profile,
    elo: elo.nextElo,
    wins: won ? profile.wins + 1 : profile.wins,
    losses: won ? profile.losses : profile.losses + 1,
    matches,
    accuracy: Number(((profile.accuracy * profile.matches + accuracy) / matches).toFixed(1)),
    history: [
      {
        mode,
        won,
        accuracy,
        createdAt: new Date().toISOString(),
        summary: coachReport?.insights[0]?.text ?? (won ? "Strong finish." : "Need better targeting."),
      },
      ...profile.history,
    ].slice(0, 5),
  };
  
  console.log("🎮 Updated profile:", updated);
  
  // Save to localStorage first
  saveProfile(updated);
  console.log("🎮 Profile saved to localStorage");
  
  // Then sync to Supabase
  console.log("🎮 Starting sync to Supabase...");
  const syncResult = await syncToSupabase(updated);
  console.log("🎮 Sync result:", syncResult);
  
  if (!syncResult.ok) {
    if (syncResult.error === "not_authenticated") {
      console.log("🎮 Match saved locally. Sign in to sync progress to cloud.");
    } else {
      console.error("🎮 Failed to sync to Supabase:", syncResult.error);
    }
  }
  
  return updated;
};
