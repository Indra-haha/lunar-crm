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

/**
 * Constructs a safe redirect URL that respects reverse proxies
 * (x-forwarded-proto, x-forwarded-host, host, x-forwarded-port)
 * so browser is never redirected to unroutable internal Docker hosts/ports (e.g. :3000 on public domains)
 */
function createSafeRedirectUrl(pathname: string, request: NextRequest, searchParams?: Record<string, string>): URL {
  const forwardedProto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto
    ? (forwardedProto.endsWith(':') ? forwardedProto : `${forwardedProto}:`)
    : request.nextUrl.protocol;

  const hostHeader = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    'localhost'
  ).split(',')[0].trim();

  let safeHost = hostHeader;
  // If host is a public domain (not localhost/127.0.0.1), strip internal container port :3000
  if (!safeHost.startsWith('localhost') && !safeHost.startsWith('127.0.0.1')) {
    safeHost = safeHost.replace(/:3000$/, '');
  }

  const url = new URL(pathname, `${protocol}//${safeHost}`);

  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuth = await isValidSession(sessionToken);

  // If user is at root '/', route based on auth status
  if (pathname === '/') {
    const target = isAuth ? '/dashboard' : '/login';
    return NextResponse.redirect(createSafeRedirectUrl(target, request));
  }

  // Redirect aliases for complaint form
  if (pathname === '/complaint' || pathname === '/form-keluhan') {
    return NextResponse.redirect(createSafeRedirectUrl('/komplain', request));
  }

  // Redirect aliases for public pre-order form
  if (pathname === '/order' || pathname === '/preorder') {
    return NextResponse.redirect(createSafeRedirectUrl('/pesan', request));
  }

  // Redirect aliases for public CSAT survey form
  if (pathname === '/review' || pathname === '/feedback' || pathname === '/ulasan') {
    return NextResponse.redirect(createSafeRedirectUrl('/survei', request));
  }

  // If user is accessing /login
  if (pathname === '/login') {
    if (isAuth) {
      // Already logged in, go to dashboard
      return NextResponse.redirect(createSafeRedirectUrl('/dashboard', request));
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
    const redirectTarget = request.nextUrl.search
      ? `${pathname}${request.nextUrl.search}`
      : pathname;
    return NextResponse.redirect(createSafeRedirectUrl('/login', request, { redirect: redirectTarget }));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (Next.js internals: static assets, chunks, HMR WebSockets, image optimization)
     * - api (API endpoints)
     * - static files with extensions (e.g. .svg, .png, .jpg, .ico, .css, .js)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next|api|favicon.ico|sitemap.xml|robots.txt|.*\\.[\\w]+$).*)',
  ],
};
