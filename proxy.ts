import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { 
  VALID_PREFIXES, 
  getLanguageFromPrefix, 
  getPrefixFromLanguage, 
  COUNTRY_TO_LANG, 
  LANGUAGES 
} from "./lib/i18n"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Set the x-url header for layouts/components that use it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-url", pathname)

  // Skip api routes, static files, uploads, next internal routes, manage routes, or files with extensions
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/manage") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Parse path segments
  const pathParts = pathname.split("/")
  const firstSeg = pathParts[1]

  // Check if first segment is a valid prefix
  if (firstSeg && VALID_PREFIXES.includes(firstSeg.toLowerCase())) {
    const langCode = getLanguageFromPrefix(firstSeg)

    // Construct the internal path (without prefix)
    const internalPath = "/" + pathParts.slice(2).join("/")

    // Set request headers so the server components can read x-next-lang
    requestHeaders.set("x-next-lang", langCode)

    const response = NextResponse.rewrite(new URL(internalPath, request.url), {
      request: {
        headers: requestHeaders,
      },
    })

    // Set language cookie so the client state and subsequent requests persist
    response.cookies.set("worldcup2026_lang", langCode, { path: "/", maxAge: 31536000 })
    return response
  }

  // If no prefix is present: auto-detect and redirect
  let detectedLang: string | undefined = undefined

  // Check for overrides in query params first (ideal for testing/debugging)
  const langParam = request.nextUrl.searchParams.get("lang")
  const countryParam = request.nextUrl.searchParams.get("country")

  if (langParam && LANGUAGES.some(l => l.code === langParam.toLowerCase())) {
    detectedLang = langParam.toLowerCase()
  } else if (countryParam && COUNTRY_TO_LANG[countryParam.toUpperCase()]) {
    detectedLang = COUNTRY_TO_LANG[countryParam.toUpperCase()]
  }

  // 1. Check if user already has a valid language cookie
  if (!detectedLang) {
    detectedLang = request.cookies.get("worldcup2026_lang")?.value
  }
  
  if (!detectedLang || !LANGUAGES.some(l => l.code === detectedLang)) {
    // 2. Detect from Cloudflare or Vercel GeoIP country headers
    const country = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country")
    if (country && COUNTRY_TO_LANG[country.toUpperCase()]) {
      detectedLang = COUNTRY_TO_LANG[country.toUpperCase()]
    } else {
      // Check if we are running locally (localhost or LAN IP)
      const host = request.headers.get("host") || ""
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("192.168.")
      let localTzLang: any = null
      
      if (isLocal) {
        try {
          const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (serverTz) {
            const tzLower = serverTz.toLowerCase()
            if (tzLower.includes("dhaka")) localTzLang = "bn"
            else if (tzLower.includes("kolkata") || tzLower.includes("calcutta")) localTzLang = "bn"
            else if (tzLower.includes("tehran")) localTzLang = "ar"
            else if (tzLower.includes("baku")) localTzLang = "az"
            else if (tzLower.includes("istanbul")) localTzLang = "tr"
            else if (tzLower.includes("shanghai") || tzLower.includes("urumqi")) localTzLang = "zh"
            else if (tzLower.includes("berlin") || tzLower.includes("busingen") || tzLower.includes("germany")) localTzLang = "de"
          }
        } catch (e) {}
      }

      if (localTzLang) {
        detectedLang = localTzLang
      } else {
        // 3. Detect from Accept-Language header
        const acceptLang = request.headers.get("accept-language")
        if (acceptLang) {
          const parsedLangs = acceptLang.split(",")
          for (const rawLang of parsedLangs) {
            const cleanLang = rawLang.split(";")[0].trim().toLowerCase()
            // Check for exact language code matches
            const exactMatch = LANGUAGES.find(l => l.code === cleanLang)
            if (exactMatch) {
              detectedLang = exactMatch.code
              break
            }
            // Check for base language matches
            const baseCode = cleanLang.split("-")[0]
            const baseMatch = LANGUAGES.find(l => l.code === baseCode)
            if (baseMatch) {
              if (baseCode === "pt") {
                detectedLang = cleanLang.includes("pt-pt") ? "pt-pt" : "pt"
              } else if (baseCode === "es") {
                detectedLang = ["es-ar", "es-cl", "es-co", "es-cr", "es-do", "es-ec", "es-gt", "es-hn", "es-mx", "es-ni", "es-pa", "es-pe", "es-pr", "es-py", "es-sv", "es-uy", "es-ve", "es-419"].some(loc => cleanLang.includes(loc))
                  ? "es-la"
                  : "es"
              } else {
                detectedLang = baseCode
              }
              break
            }
          }
        }
      }
    }
  }

  // Fallback to "en" if nothing is resolved
  const finalLang = (detectedLang && LANGUAGES.some(l => l.code === detectedLang)) 
    ? (detectedLang as any) 
    : "en"

  const redirectPrefix = getPrefixFromLanguage(finalLang)

  // Redirect to prefixed URL, keeping query parameters and pathname
  const redirectUrl = new URL(`/${redirectPrefix}${pathname}${request.nextUrl.search}`, request.url)
  const response = NextResponse.redirect(redirectUrl, 307)
  response.cookies.set("worldcup2026_lang", finalLang, { path: "/", maxAge: 31536000 })
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (upload files)
     */
    "/((?!api|_next/static|_next/image|uploads|favicon.ico).*)",
  ],
}
