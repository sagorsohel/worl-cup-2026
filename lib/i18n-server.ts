import { headers, cookies } from "next/headers"
import { LanguageCode, LANGUAGES } from "./i18n"

export async function getPreferredLanguage(): Promise<LanguageCode> {
  try {
    const headersList = await headers()
    const acceptLang = headersList.get("accept-language")
    if (!acceptLang) return "en"
    
    const parsedLangs = acceptLang.split(",")
    for (const rawLang of parsedLangs) {
      let cleanLang = rawLang.split(";")[0].trim().toLowerCase()
      // Map standard browser language codes to our custom keys
      if (cleanLang === "ja" || cleanLang === "ja-jp") cleanLang = "jp"
      else if (cleanLang === "ko" || cleanLang === "ko-kr") cleanLang = "kr"
      else if (cleanLang === "vi" || cleanLang === "vi-vn") cleanLang = "vn"

      const exactMatch = LANGUAGES.find(l => l.code === cleanLang)
      if (exactMatch) return exactMatch.code

      let baseCode = cleanLang.split("-")[0] as LanguageCode
      if (baseCode === "ja" as any) baseCode = "jp" as any
      else if (baseCode === "ko" as any) baseCode = "kr" as any
      else if (baseCode === "vi" as any) baseCode = "vn" as any

      const baseMatch = LANGUAGES.find(l => l.code === baseCode)
      if (baseMatch) {
        if (baseCode === "pt") {
          if (cleanLang.includes("pt-pt")) return "pt-pt"
          return "pt"
        }
        if (baseCode === "es") {
          if (["es-ar", "es-cl", "es-co", "es-cr", "es-do", "es-ec", "es-gt", "es-hn", "es-mx", "es-ni", "es-pa", "es-pe", "es-pr", "es-py", "es-sv", "es-uy", "es-ve", "es-419"].some(loc => cleanLang.includes(loc))) {
            return "es-la"
          }
          return "es"
        }
        return baseCode
      }
    }
  } catch (err) {
    console.error("Failed to parse accept-language header:", err)
  }
  return "en"
}

export async function getLanguageFromServer(): Promise<LanguageCode> {
  try {
    const headersList = await headers()
    const headerLang = headersList.get("x-next-lang")
    if (headerLang && LANGUAGES.some(l => l.code === headerLang)) {
      return headerLang as LanguageCode
    }
  } catch (e) {
    console.error("Failed to read x-next-lang header on server:", e)
  }

  try {
    const cookieList = await cookies()
    const cookieLang = cookieList.get("worldcup2026_lang")?.value
    if (cookieLang && LANGUAGES.some(l => l.code === cookieLang)) {
      return cookieLang as LanguageCode
    }
  } catch (e) {
    console.error("Failed to read lang cookie on server:", e)
  }
  return getPreferredLanguage()
}

export { getLocalizedTeamName } from "./i18n"

