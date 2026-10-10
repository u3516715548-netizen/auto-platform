import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { dashboardPath } from "@/lib/auth/auth-redirects";
import {
  isPerfServerTimingEnabled,
  logPerfDuration,
} from "@/lib/perf/server-timing";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";
import { resolveHobbyDemoTenantSlugFromRequest } from "@/lib/tenant/vercel-demo-only";

function perfPathLabel(pathname: string): string {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/vehicles/")) return "/vehicles/[slug]";
  if (pathname.startsWith("/p/")) return "/p/[slug]";
  if (pathname.startsWith("/dashboard")) return "/dashboard";
  return pathname.slice(0, 64);
}

/**
 * Refresh Auth cookies and attach tenant slug hint from Host.
 * Redirects use relative paths so the current Host is preserved
 * (acme.localhost → acme dashboard, never apex localhost).
 *
 * HOBBY_DEMO_ONLY: may attach the server-env demo slug on Hobby apex Host only.
 */
export async function updateSession(request: NextRequest) {
  const perfEnabled = isPerfServerTimingEnabled();
  const totalStarted = perfEnabled ? performance.now() : 0;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();
  const pathname = request.nextUrl.pathname;
  const pathLabel = perfPathLabel(pathname);

  if (!url || !anonKey) {
    if (perfEnabled) {
      logPerfDuration("middleware.total", totalStarted, { path: pathLabel });
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const getUserStarted = perfEnabled ? performance.now() : 0;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (perfEnabled) {
    logPerfDuration("middleware.getUser", getUserStarted, { path: pathLabel });
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (rootDomain) {
    const resolved = resolveTenantSlugFromHost(host, rootDomain);
    if (resolved.kind === "tenant") {
      response.headers.set("x-tenant-slug", resolved.slug);
    } else if (resolved.kind === "apex") {
      const demoSlug = resolveHobbyDemoTenantSlugFromRequest(host, rootDomain);
      if (demoSlug) {
        response.headers.set("x-tenant-slug", demoSlug);
      }
    }
  }

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isTemplatePreview = pathname === "/storefront-template-preview";
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");

  if ((isDashboard || isTemplatePreview) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("auth", "required");
    if (perfEnabled) {
      logPerfDuration("middleware.total", totalStarted, { path: pathLabel });
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboardPath();
    redirectUrl.search = "";
    if (perfEnabled) {
      logPerfDuration("middleware.total", totalStarted, { path: pathLabel });
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (perfEnabled) {
    logPerfDuration("middleware.total", totalStarted, { path: pathLabel });
  }
  return response;
}
