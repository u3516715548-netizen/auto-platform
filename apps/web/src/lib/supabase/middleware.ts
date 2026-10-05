import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { dashboardPath } from "@/lib/auth/auth-redirects";
import { resolveTenantSlugFromHost } from "@/lib/tenant/resolve-tenant-from-host";

/**
 * Refresh Auth cookies and attach tenant slug hint from Host.
 * Redirects use relative paths so the current Host is preserved
 * (acme.localhost → acme dashboard, never apex localhost).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();

  if (!url || !anonKey) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (rootDomain) {
    const resolved = resolveTenantSlugFromHost(host, rootDomain);
    if (resolved.kind === "tenant") {
      response.headers.set("x-tenant-slug", resolved.slug);
    }
  }

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isLogin = pathname === "/login" || pathname.startsWith("/login/");

  if (isDashboard && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("auth", "required");
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dashboardPath();
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
