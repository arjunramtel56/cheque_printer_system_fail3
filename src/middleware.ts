import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/faq",
  "/blog",
];
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
const adminRoutes = ["/admin"];

// Trial-restricted routes (require active trial or paid subscription)
const protectedUserRoutes = ["/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const locale = pathname.split("/")[1] || "en";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Allow public static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/logos") ||
    pathname.includes("favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Redirect / to /en
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en", request.url));
  }

  // Bare /dev/calibration (no locale) -> canonical locale-prefixed path
  if (pathname === "/dev/calibration") {
    return NextResponse.redirect(new URL("/en/dev/calibration", request.url));
  }

  // Calibration tool: open in development; 404 in production unless
  // ENABLE_CALIBRATION=true (then normal auth applies).
  if (pathWithoutLocale === "/dev/calibration") {
    const enabled =
      process.env.NODE_ENV !== "production" || process.env.ENABLE_CALIBRATION === "true";
    if (!enabled) {
      return new NextResponse(null, { status: 404 });
    }
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
  }

  // If user is on auth page but already logged in, redirect to dashboard
  if (token && authRoutes.some((route) => pathWithoutLocale.startsWith(route))) {
    const dashboardPath =
      token.role === "ADMIN" || token.role === "SUPER_ADMIN"
        ? `/${locale}/admin`
        : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Check if route is public (marketing pages)
  const isPublicRoute = publicRoutes.some(
    (route) => pathWithoutLocale === route || pathWithoutLocale.startsWith(route + "/")
  );

  // If route is not public and user is not logged in, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes
  if (token && adminRoutes.some((route) => pathWithoutLocale.startsWith(route))) {
    if (token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Check suspended/expired users
  if (token && (token.status === "SUSPENDED" || token.status === "EXPIRED")) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("error", "account_" + token.status.toLowerCase());
    return NextResponse.redirect(loginUrl);
  }

  // Check trial expiry for trial users
  if (token && token.role === "TRIAL_USER" && token.trialExpired === true) {
    // Redirect trial users whose trial has expired to subscription/upgrade page
    if (protectedUserRoutes.some((route) => pathWithoutLocale.startsWith(route))) {
      const subUrl = new URL(`/${locale}/dashboard/subscription`, request.url);
      subUrl.searchParams.set("error", "trial_expired");
      return NextResponse.redirect(subUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|logos|api/auth).*)"],
};
