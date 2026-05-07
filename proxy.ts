import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, detectLocale, locales } from "@/lib/i18n";
import { updateSession } from "@/supabase/middleware";

const PUBLIC_FILE = /\.[^/]+$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/supabase") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const localeFromHeader = detectLocale(request.headers.get("accept-language"));
    const locale = localeFromHeader ?? defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
