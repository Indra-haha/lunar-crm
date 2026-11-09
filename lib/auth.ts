import crypto from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'lunar_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'lunarchivve-secret-key-studio-crm-2026-secure-token';

export interface SessionPayload {
  adminId: string;
  email: string;
  username: string;
  role: string;
  fullName: string;
  avatarUrl?: string;
  exp: number; // Unix timestamp in ms
}

/**
 * Hash password with PBKDF2 (100,000 iterations, SHA-512)
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash & salt
 */
export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Create a tamper-proof HMAC-SHA256 signed session token
 */
export function createSessionToken(data: Omit<SessionPayload, 'exp'>, maxAgeDays = 7): string {
  const payload: SessionPayload = {
    ...data,
    exp: Date.now() + maxAgeDays * 24 * 60 * 60 * 1000,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = Buffer.from(payloadString).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('hex');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signature and expiration
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encodedPayload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    const payloadString = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadString) as SessionPayload;

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set session HTTP-only cookie
 */
export async function setSessionCookie(token: string, maxAgeDays = 7): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  });
}

/**
 * Clear session HTTP-only cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current session from cookie in Server Actions or Server Components
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
