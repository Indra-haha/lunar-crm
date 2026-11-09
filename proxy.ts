import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'lunar_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'lunarchivve-secret-key-studio-crm-2026-secure-token';

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token || !token.includes('.')) return false;
  try {
    const [encodedPayload, signatureHex] = token.split('.');
    if (!encodedPayload || !signatureHex) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const matches = signatureHex.match(/.{1,2}/g);
    if (!matches) return false;
    const signatureBytes = new Uint8Array(matches.map((b) => parseInt(b, 16)));

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      enc.encode(encodedPayload)
    );
    if (!valid) return false;

    // Decode base64url payload
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    if (Date.now() > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuth = await isValidSession(sessionToken);

  // If user is at root '/', route based on auth status
  if (pathname === '/') {
    if (isAuth) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect aliases for complaint form
  if (pathname === '/complaint' || pathname === '/form-keluhan') {
    return NextResponse.redirect(new URL('/komplain', request.url));
  }

  // Redirect aliases for public pre-order form
  if (pathname === '/order' || pathname === '/preorder') {
    return NextResponse.redirect(new URL('/pesan', request.url));
  }

  // Redirect aliases for public CSAT survey form
  if (pathname === '/review' || pathname === '/feedback' || pathname === '/ulasan') {
    return NextResponse.redirect(new URL('/survei', request.url));
  }

  // If user is accessing /login
  if (pathname === '/login') {
    if (isAuth) {
      // Already logged in, go to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow login page access
    return NextResponse.next();
  }

  // Protected routes: /dashboard, /customers, /pipeline, /support, /leads, /products
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/pipeline') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/leads') ||
    pathname.startsWith('/products');

  if (isProtectedRoute && !isAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
