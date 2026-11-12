import { NextResponse } from 'next/server';
import { connectToDatabase, db } from '@/lib/db';
import { admins } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, admin: null }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, admin: session });
  } catch (err) {
    console.error('API GET /api/auth error:', err);
    return NextResponse.json({ error: 'Gagal memuat sesi', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const identifier = String(data.identifier || data.username || data.email || '').trim().toLowerCase();
    const password = String(data.password || '').trim();
    const rememberMe = data.rememberMe !== false;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email / Username dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const [admin] = await db
      .select()
      .from(admins)
      .where(or(eq(admins.email, identifier), eq(admins.username, identifier)))
      .limit(1);

    if (!admin) {
      return NextResponse.json({ error: 'Akun admin tidak ditemukan. Periksa email atau username Anda.' }, { status: 401 });
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'Akun dinonaktifkan oleh administrator. Hubungi tim teknis.' }, { status: 403 });
    }

    const isValid = verifyPassword(password, admin.passwordHash, admin.salt);
    if (!isValid) {
      return NextResponse.json({ error: 'Kata sandi tidak sesuai. Silakan coba kembali.' }, { status: 401 });
    }

    await db
      .update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, admin.id));

    const maxAgeDays = rememberMe ? 14 : 1;
    const token = createSessionToken(
      {
        adminId: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        fullName: admin.fullName,
        avatarUrl: admin.avatarUrl || '',
      },
      maxAgeDays
    );

    try {
      await setSessionCookie(token, maxAgeDays);
    } catch {
      // In standalone script / test environment without Next.js request cookies store
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        avatarUrl: admin.avatarUrl || '',
      },
    });
  } catch (err) {
    console.error('API POST /api/auth error:', err);
    return NextResponse.json({ error: 'Gagal memproses autentikasi', details: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    try {
      await clearSessionCookie();
    } catch {
      // In standalone script / test environment without Next.js request cookies store
    }
    return NextResponse.json({ success: true, message: 'Berhasil keluar dari sesi admin.' });
  } catch (err) {
    console.error('API DELETE /api/auth error:', err);
    return NextResponse.json({ error: 'Gagal keluar dari sesi', details: String(err) }, { status: 500 });
  }
}
