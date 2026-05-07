import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";

import { ProfileClient } from "./profile-client";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ProfileClient />;
}
