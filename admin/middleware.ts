import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotas públicas / a ignorar pelo middleware
  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||   // rewrites para o backend NestJS
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Cookie JWT definido pelo NestJS
  const token = req.cookies.get("admin_token");

  // Páginas protegidas: redirecionar para login se não houver token
  if (!token?.value) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
