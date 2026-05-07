import { NextResponse } from "next/server";

import { createClient } from "@/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ remote: null }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, city, elo, games_played, matches, wins, losses, accuracy, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ remote: null, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ remote: profile ?? null });
}
