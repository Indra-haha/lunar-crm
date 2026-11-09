'use server';

import { connectToDatabase, db } from '@/lib/db';
import { admins } from '@/lib/schema';
import { eq, or } from 'drizzle-orm';
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  SessionPayload,
} from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface LoginResult {
  success: boolean;
  error?: string;
  admin?: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
    avatarUrl?: string;
  };
}

export async function loginAdmin(
  identifier: string,
  password: string,
  rememberMe: boolean = true
): Promise<LoginResult> {
  try {
    const trimmedId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!trimmedId || !cleanPassword) {
      return { success: false, error: 'Email / Username dan kata sandi wajib diisi.' };
    }

    await connectToDatabase();

    // Query admin by either email or username
    const [admin] = await db
      .select()
      .from(admins)
      .where(or(eq(admins.email, trimmedId), eq(admins.username, trimmedId)))
      .limit(1);

    if (!admin) {
      return {
        success: false,
        error: 'Akun admin tidak ditemukan. Periksa email atau username Anda.',
      };
    }

    if (!admin.isActive) {
      return {
        success: false,
        error: 'Akun dinonaktifkan oleh administrator. Hubungi tim teknis.',
      };
    }

    const isValid = verifyPassword(cleanPassword, admin.passwordHash, admin.salt);
    if (!isValid) {
      return {
        success: false,
        error: 'Kata sandi tidak sesuai. Silakan coba kembali.',
      };
    }

    // Update lastLoginAt
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

    await setSessionCookie(token, maxAgeDays);

    return {
      success: true,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        avatarUrl: admin.avatarUrl || '',
      },
    };
  } catch (err: unknown) {
    console.error('Error in loginAdmin:', err);
    return {
      success: false,
      error: 'Terjadi gangguan server. Silakan coba beberapa saat lagi.',
    };
  }
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  try {
    await clearSessionCookie();
  } catch (err) {
    console.error('Error in logoutAdmin:', err);
  }
  redirect('/login');
}

export async function getCurrentAdmin(): Promise<SessionPayload | null> {
  return await getSession();
}
