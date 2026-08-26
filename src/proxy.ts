import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminAuthorized, shouldSetAdminCookie } from "@/lib/admin-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!isAdminAuthorized(request)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const res = NextResponse.next();
    const secret = shouldSetAdminCookie(request);
    if (secret) {
      res.cookies.set(ADMIN_COOKIE, secret, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return res;
  }

  if (pathname === "/api/sources" && request.method === "POST") {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname === "/api/prompt-experiments" && request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/sources", "/api/prompt-experiments"],
};
