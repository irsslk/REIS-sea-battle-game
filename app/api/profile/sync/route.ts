import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/supabase/server";

interface SyncBody {
  username: string;
  city: string;
  elo: number;
  wins: number;
  losses: number;
  matches: number;
  accuracy: number;
}

const uniqueUsername = (base: string, userId: string): string => {
  const sanitized = base.replace(/\s+/g, "_").replace(/[^\w\-а-яА-ЯёЁІіӘәҒғҚқҢңӨөҰұҺһ]/gu, "").slice(0, 24);
  const prefix = sanitized.length >= 3 ? sanitized : "captain";
  return `${prefix}_${userId.slice(0, 8)}`;
};

const upsertLeaderboardRow = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  payload: {
    city: string | null;
    region: string;
    elo: number;
    wins: number;
    losses: number;
    rank_scope: string;
  },
) => {
  const baseSelect = () =>
    supabase
      .from("leaderboards")
      .select("id")
      .eq("user_id", userId)
      .eq("rank_scope", payload.rank_scope);

  const select =
    payload.city === null
      ? await baseSelect().is("city", null).maybeSingle()
      : await baseSelect().eq("city", payload.city).maybeSingle();

  if (select.error) {
    return { ok: false, error: select.error.message };
  }

  const rowPayload = {
    user_id: userId,
    city: payload.city,
    region: payload.region,
    elo: payload.elo,
    wins: payload.wins,
    losses: payload.losses,
    rank_scope: payload.rank_scope,
    snapshot_at: new Date().toISOString(),
  };

  if (select.data?.id) {
    const u = await supabase.from("leaderboards").update(rowPayload).eq("id", select.data.id);
    if (u.error) return { ok: false, error: u.error.message };
    return { ok: true };
  }

  const i = await supabase.from("leaderboards").insert(rowPayload);
  if (i.error) return { ok: false, error: i.error.message };
  return { ok: true };
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, message: "Guest user - data saved locally only" });
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = user.email ?? `${user.id}@reis.local`;
  const upsertUsers = await supabase.from("users").upsert(
    { id: user.id, email },
    { onConflict: "id" },
  );

  if (upsertUsers.error) {
    return NextResponse.json({ ok: false, error: upsertUsers.error.message }, { status: 400 });
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const username = uniqueUsername(body.username || fullName || "captain", user.id);

  const profilePayload = {
    id: user.id,
    username,
    full_name: fullName || null,
    city: body.city?.trim() || null,
    country: "Kazakhstan",
    region: "CIS",
    elo: body.elo,
    games_played: body.matches,
    matches: body.matches,
    wins: body.wins,
    losses: body.losses,
    accuracy: Number(body.accuracy ?? 0),
    updated_at: new Date().toISOString(),
  };

  const profileRes = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (profileRes.error) {
    return NextResponse.json({ ok: false, error: profileRes.error.message }, { status: 400 });
  }

  const globalLb = await upsertLeaderboardRow(supabase, user.id, {
    city: null,
    region: "World",
    elo: body.elo,
    wins: body.wins,
    losses: body.losses,
    rank_scope: "region",
  });

  if (!globalLb.ok) {
    return NextResponse.json({ ok: false, error: globalLb.error ?? "leaderboard global" }, { status: 400 });
  }

  if (body.city?.trim()) {
    const cityLb = await upsertLeaderboardRow(supabase, user.id, {
      city: body.city.trim(),
      region: "Kazakhstan",
      elo: body.elo,
      wins: body.wins,
      losses: body.losses,
      rank_scope: "city",
    });
    if (!cityLb.ok) {
      return NextResponse.json({ ok: false, error: cityLb.error ?? "leaderboard city" }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
