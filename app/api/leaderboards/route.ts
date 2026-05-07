import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");

  let query = supabase
    .from("leaderboards")
    .select("user_id, city, elo, wins")
    .eq("rank_scope", city ? "city" : "region")
    .order("elo", { ascending: false })
    .limit(100);

  if (city) {
    query = query.eq("city", city);
  } else {
    query = query.is("city", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[leaderboards] query error:", error.message, error.code);
    return NextResponse.json({ rows: [], error: error.message }, { status: 500 });
  }
  console.log("[leaderboards] rows fetched:", data?.length ?? 0);

  const userIds = (data ?? []).map((r) => r.user_id);

  let profileMap: Record<string, { username: string | null; full_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      profileMap[p.id] = { username: p.username, full_name: p.full_name };
    }
  }

  const rows =
    (data ?? []).map((row) => {
      const profile = profileMap[row.user_id];
      const name =
        profile?.full_name ??
        profile?.username ??
        `Player-${row.user_id.slice(0, 6)}`;
      return {
        name,
        city: row.city ?? "Global",
        elo: row.elo,
        wins: row.wins,
      };
    });

  return NextResponse.json({ rows });
}
