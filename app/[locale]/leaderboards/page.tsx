import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";

import { LeaderboardsClient } from "./leaderboards-client";

interface LeaderboardsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LeaderboardsPage({ params }: LeaderboardsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LeaderboardsClient />;
}
