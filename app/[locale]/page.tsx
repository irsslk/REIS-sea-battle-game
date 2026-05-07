import { notFound } from "next/navigation";

import { LandingClient } from "./landing-client";
import { isLocale } from "@/lib/i18n";
import { messages } from "@/lib/messages";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = messages[locale];

  return <LandingClient locale={locale} t={t} />;
}
