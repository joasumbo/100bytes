import { NextRequest, NextResponse } from "next/server";

// Protege tudo exceto login, assets e a rota de ingestão de erros.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/ingest") || // ingestão de erros das outras apps (usa token próprio)
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }
  const token = req.cookies.get("panel_token");
  if (!token?.value) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "não autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
