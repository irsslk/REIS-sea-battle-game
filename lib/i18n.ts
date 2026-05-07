export const locales = ["en", "ru", "kk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
};

export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale);

export const detectLocale = (acceptLanguage: string | null): Locale => {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const normalized = acceptLanguage.toLowerCase();

  if (normalized.includes("kk")) {
    return "kk";
  }

  if (normalized.includes("ru")) {
    return "ru";
  }

  return "en";
};
