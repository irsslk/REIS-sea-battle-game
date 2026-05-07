import { notFound } from "next/navigation";

import { isLocale, Locale } from "@/lib/i18n";

import { GameClient } from "./components/GameClient";

interface GamePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ room?: string; createRoom?: string }>;
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { locale } = await params;
  const { room, createRoom } = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  return <GameClient locale={locale as Locale} roomCode={room ?? null} createRoom={createRoom === "1"} />;
}
