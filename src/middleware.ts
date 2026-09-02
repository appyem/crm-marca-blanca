// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard'];

// Rutas públicas (login, register, etc.)
const publicRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si la ruta está protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Obtener el token de sesión de Firebase (almacenado en cookies)
  const sessionCookie = request.cookies.get('__session');

  // Si es una ruta protegida y no hay sesión, redirigir al login
  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si es una ruta pública y ya hay sesión, redirigir al dashboard
  if (isPublicRoute && sessionCookie) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Continuar con la petición normal
  return NextResponse.next();
}

// Configurar qué rutas debe interceptar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};