import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "ww_admin";

export function getAdminSecret(): string | null {
  const secret = process.env.ADMIN_SECRET?.trim();
  return secret ? secret : null;
}

/** Fail closed: missing ADMIN_SECRET means nobody is authorized. */
export function isAdminAuthorized(req: Request): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ww_admin=([^;]+)/);
  if (match && decodeURIComponent(match[1]!) === secret) return true;

  return false;
}

export function adminUnauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized", hint: "Set ADMIN_SECRET and pass Authorization: Bearer <secret> or ?key=" },
    { status: 401 }
  );
}

export function shouldSetAdminCookie(req: NextRequest): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;
  if (req.nextUrl.searchParams.get("key") === secret) return secret;
  return null;
}
