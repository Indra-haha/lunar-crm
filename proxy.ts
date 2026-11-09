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
 * (x-forwarded-proto, x-forwarded-host, x-forwarded-port)
 * so browser is never redirected to unroutable internal Docker hosts (e.g. http://0.0.0.0:3000 or http://lunar:3000)
 */
function createSafeRedirectUrl(pathname: string, request: NextRequest, searchParams?: Record<string, string>): URL {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    url.protocol = forwardedProto.endsWith(':') ? forwardedProto : `${forwardedProto}:`;
  }

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedHost) {
    url.host = forwardedHost;
  }

  const forwardedPort = request.headers.get('x-forwarded-port');
  if (forwardedPort && !forwardedHost?.includes(':')) {
    if (forwardedPort === '80' || forwardedPort === '443') {
      url.port = '';
    } else {
      url.port = forwardedPort;
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
    return NextResponse.redirect(createSafeRedirectUrl('/login', request, { redirect: pathname }));
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
