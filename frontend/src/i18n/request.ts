import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const requested = await requestLocale;
  const locale = isAppLocale(cookieLocale)
    ? cookieLocale
    : isAppLocale(requested)
      ? requested
      : DEFAULT_LOCALE;

  const messages = (await import(`./messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;

  return {
    locale,
    messages,
  };
});
