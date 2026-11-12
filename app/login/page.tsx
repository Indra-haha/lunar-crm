'use client';

import React, { useState, useTransition, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
// Auth via /api/auth route handler

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const [identifier, setIdentifier] = useState('admin@lunarchivve.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDemoFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage('');
  };

  const executeLogin = (idVal: string, passVal: string, remVal: boolean) => {
    setErrorMessage('');

    if (!idVal.trim()) {
      setErrorMessage('Silakan masukkan email atau username admin.');
      return;
    }
    if (!passVal.trim()) {
      setErrorMessage('Silakan masukkan kata sandi Anda.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: idVal,
            password: passVal,
            rememberMe: remVal,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          setErrorMessage(result.error || 'Autentikasi gagal.');
          return;
        }

        setIsSuccess(true);
        // Full navigation ensures the newly set lunar_session cookie is sent in HTTP headers
        window.location.href = redirectUrl;
      } catch (err) {
        console.error('Login error:', err);
        setErrorMessage('Terjadi gangguan jaringan atau server. Coba beberapa saat lagi.');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    executeLogin(identifier, password, rememberMe);
  };

  const handleFormAction = async (formData: FormData) => {
    const idVal = (formData.get('identifier') as string) || identifier;
    const passVal = (formData.get('password') as string) || password;
    const remVal = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true' || rememberMe;
    executeLogin(idVal, passVal, remVal);
  };

  return (
    <div className="min-h-screen bg-background text-slate-text-primary flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.svg"
            alt="Lunarchivve"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl shadow-sm shadow-primary/20 object-contain"
            priority
          />
          <div className="flex flex-col">
            <span className="font-title-sm text-[15px] font-bold text-slate-text-primary tracking-tight">
              Lunarchivve
            </span>
            <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
              Merch &amp; Studio CRM
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-status-success-text bg-status-success-surface px-3 py-1.5 rounded-full border border-status-success-border">
          <ShieldCheck className="w-4 h-4 text-status-success-base" />
          <span>UU No. 27/2022 (PDP) Protected</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-5xl mx-auto px-6 py-6 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-card rounded-2xl border border-slate-border shadow-sm overflow-hidden">
          
          {/* Left Hero Column: Studio Highlights */}
          <div className="lg:col-span-5 p-8 lg:p-10 bg-slate-surface border-b lg:border-b-0 lg:border-r border-slate-border flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[10px] uppercase tracking-wider font-bold mb-6">
                <span>Gerbang Akses Admin v2.4.0</span>
              </div>

              <h2 className="font-headline-lg text-2xl font-bold text-slate-text-primary tracking-tight leading-snug mb-3">
                Kendali Penuh Studio &amp; Pipeline Pre-Order
              </h2>

              <p className="text-xs text-slate-text-secondary leading-relaxed mb-8">
                Akses single customer view terenkripsi, monitor SLA First Response Time (FRT) &lt; 15 menit, verifikasi checklist QA fisik barang, dan kelola batch produksi merchandise.
              </p>

              {/* Feature Checkpoints */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-card border border-slate-border shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-status-success-surface text-status-success-base flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-text-primary">Kepatuhan UU PDP No. 27/2022</h4>
                    <p className="text-[11px] text-slate-text-secondary leading-tight mt-0.5">
                      Sensor otomatis nomor telepon pelanggan (0812-****-8821) &amp; persetujuan promosi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-card border border-slate-border shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-text-primary">SLA FRT &lt; 15m &amp; Integrasi WhatsApp</h4>
                    <p className="text-[11px] text-slate-text-secondary leading-tight mt-0.5">
                      Balas prospek dengan template cerdas dan deep-link Click-to-Chat wa.me otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-card border border-slate-border shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-status-warning-surface text-status-warning-base flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-text-primary">Digital QC 4-Poin &amp; Zero Hassle Reprints</h4>
                    <p className="text-[11px] text-slate-text-secondary leading-tight mt-0.5">
                      Inspeksi fisik akrilik, photocard &amp; approval kirim pesanan langsung ke pemesan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-border flex items-center justify-between text-[11px] text-slate-text-muted">
              <span>Database: PostgreSQL</span>
              <span className="text-status-success-text font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-success-base" />
                Sistem Aktif
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Login Form */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-slate-card">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h3 className="font-headline-lg text-xl font-bold text-slate-text-primary tracking-tight">
                  Masuk ke Dashboard Operasi
                </h3>
                <p className="text-xs text-slate-text-secondary mt-1">
                  Gunakan email atau username admin terdaftar tim Lunarchivve.
                </p>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-status-danger-surface border border-status-danger-border text-status-danger-text text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Success Alert */}
              {isSuccess && (
                <div className="mb-5 p-3.5 rounded-xl bg-status-success-surface border border-status-success-border text-status-success-text text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">Autentikasi berhasil! Mengalihkan ke dashboard...</span>
                </div>
              )}

              {/* Form */}
              <form action={handleFormAction} method="post" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-text-primary mb-1.5" htmlFor="identifier">
                    Email / Username
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-text-muted absolute left-3.5 pointer-events-none" />
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@lunarchivve.com atau admin"
                      autoComplete="username"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-text-primary" htmlFor="password">
                      Kata Sandi
                    </label>
                    <span className="text-[11px] text-slate-text-muted">
                      Terenkripsi PBKDF2
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-text-muted absolute left-3.5 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-text-muted hover:text-slate-text-primary transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-border text-primary-container focus:ring-primary-container cursor-pointer"
                    />
                    <span className="text-xs text-slate-text-secondary">Ingat sesi saya (14 Hari)</span>
                  </label>
                  <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Bantuan SOP
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isPending || isSuccess}
                  className="w-full mt-2 py-2.5 px-4 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Kredensial...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Studio CRM</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Fill Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-border text-center">
                <span className="text-[11px] font-semibold text-slate-text-muted block mb-2">
                  Akun Demo Uji Coba:
                </span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('admin@lunarchivve.com', 'admin123')}
                    className="px-2.5 py-1 rounded-md bg-slate-surface border border-slate-border hover:bg-slate-card text-[11px] font-medium text-slate-text-secondary transition-all cursor-pointer"
                  >
                    Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('staff@lunarchivve.com', 'staff123')}
                    className="px-2.5 py-1 rounded-md bg-slate-surface border border-slate-border hover:bg-slate-card text-[11px] font-medium text-slate-text-secondary transition-all cursor-pointer"
                  >
                    Studio Staff
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-text-muted border-t border-slate-border">
        <p>© 2026 Lunarchivve Studio. Hak cipta dilindungi undang-undang.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Keamanan Sesi TLS 1.3</span>
          <span>•</span>
          <span>UU No. 27/2022 PDP</span>
          <span>•</span>
          <span>SOP Zero Hassle Reprints</span>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-slate-text-muted text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
            <span>Memuat Portal Admin Lunarchivve...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
