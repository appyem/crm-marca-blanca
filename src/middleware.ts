// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas permitidas (sin autenticación)
const publicPaths = ['/', '/login', '/register'];

// Prefijos que NO deben protegerse
const publicPrefixes = ['/api/', '/_next/', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Dejar pasar rutas públicas exactas
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. Dejar pasar rutas con prefijos públicos (API, assets)
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 3. Verificar cookie de sesión
  const sessionCookie = request.cookies.get('__session');

  // 4. Si no hay sesión, redirigir al login
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Si hay sesión y estamos en /login o /register, ir al dashboard
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};