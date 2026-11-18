import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isAppLocale(requested) ? requested : DEFAULT_LOCALE;

  const messages = (await import(`./messages/${locale}.json`)).default as Record<
    string,
    unknown
  >;

  return {
    locale,
    messages,
  };
});
