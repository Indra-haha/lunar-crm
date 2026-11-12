'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Users,
  Kanban,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  HelpCircle,
  Sparkles,
  X,
  BookOpen,
  CheckCircle2,
  Lock,
  LogOut,
  Package,
} from 'lucide-react';
import { logoutAdmin } from '@/app/actions/auth';

const navigationItems = [
  {
    name: 'Master Produk & Varian',
    href: '/products',
    icon: Package,
    badge: 'Katalog',
  },
  {
    name: 'Database Pelanggan',
    href: '/customers',
    icon: Users,
    badge: 'PDP',
  },
  {
    name: 'Pesanan & Pipeline',
    href: '/pipeline',
    icon: Kanban,
    badge: '5 Tahap',
  },
  {
    name: 'Tiket Keluhan & QA',
    href: '/support',
    icon: ShieldCheck,
    badge: 'QC',
  },
  {
    name: 'Leads & Template WA',
    href: '/leads',
    icon: MessageSquare,
    badge: 'FRT',
  },
  {
    name: 'Dashboard KPI & CSAT',
    href: '/dashboard',
    icon: BarChart3,
    badge: 'KPI',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-card border-r border-slate-border z-40 flex flex-col justify-between shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
        <div className="flex flex-col">
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-border">
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

          {/* Menu Navigation */}
          <div className="px-3 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-text-muted px-3 mb-2">
              Menu Utama
            </p>
            <nav className="flex flex-col gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all text-[13px] font-medium ${
                      isActive
                        ? 'bg-primary-container text-white font-semibold shadow-sm'
                        : 'text-slate-text-secondary hover:bg-slate-surface hover:text-slate-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-[18px] h-[18px] ${
                          isActive ? 'text-white' : 'text-slate-text-secondary'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Storage & Status Widget */}
        <div className="p-4 border-t border-slate-border">
          <div className="bg-slate-surface p-3 rounded-lg border border-slate-border mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-text-secondary font-medium">
                Cloud Drive &amp; Mockup
              </span>
              <span className="text-[11px] text-slate-text-primary font-bold">78%</span>
            </div>
            <div className="w-full bg-slate-border rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary-container h-1.5 rounded-full" style={{ width: '78%' }} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-border text-[11px]">
              <span className="text-slate-text-muted">Batch Aktif:</span>
              <span className="text-status-success-text font-bold">PO #12 Production</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 text-slate-text-secondary hover:text-slate-text-primary transition-colors text-xs font-medium cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-slate-text-muted" />
              <span>Pusat Bantuan</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await logoutAdmin();
              }}
              title="Keluar dari sesi admin"
              className="flex items-center gap-1 text-[11px] text-slate-text-muted hover:text-rose-600 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Pusat Bantuan (SOP & Documentation) Modal */}
      {helpOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Pusat Bantuan &amp; Panduan SOP Studio
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Standar Operasional Prosedur CRM Lunarchivve v2.4.0
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs text-slate-text-secondary leading-relaxed">
              <div className="p-3 bg-surface-container-low rounded-xl border border-slate-border">
                <div className="flex items-center gap-1.5 text-primary font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. SLA First Response Time (FRT) &lt; 15 Menit</span>
                </div>
                <p>
                  Setiap prospek baru di WhatsApp/Instagram wajib dibalas dalam kurun waktu 15 menit menggunakan template balasan cepat untuk memaksimalkan rasio konversi PO (TOWS W2+O2).
                </p>
              </div>

              <div className="p-3 bg-slate-surface rounded-xl border border-slate-border">
                <div className="flex items-center gap-1.5 text-slate-text-primary font-bold mb-1">
                  <Lock className="w-4 h-4 text-status-success-base" />
                  <span>2. Kepatuhan UU No. 27/2022 (PDP)</span>
                </div>
                <p>
                  Seluruh nomor kontak pelanggan wajib disensor otomatis (0812-****-8821). Hanya admin berwenang yang dapat membuka nomor saat mengeksekusi pengiriman atau pelacakan resi kurir.
                </p>
              </div>

              <div className="p-3 bg-slate-surface rounded-xl border border-slate-border">
                <div className="flex items-center gap-1.5 text-slate-text-primary font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-status-warning-base" />
                  <span>3. Verifikasi Digital QC Checklist</span>
                </div>
                <p>
                  Pesanan di tahap QA &amp; Packing wajib melalui 4 poin verifikasi fisik (kesesuaian brief, jumlah, bebas cacat resin, peel-off film). Foto inspeksi wajib dilampirkan ke customer sebelum generate resi.
                </p>
              </div>

              <div className="p-3 bg-status-danger-surface rounded-xl border border-status-danger-border">
                <div className="flex items-center gap-1.5 text-status-danger-text font-bold mb-1">
                  <span>4. Klausul Zero Hassle Reprints (Komplain Cacat)</span>
                </div>
                <p className="text-status-danger-text">
                  Jika terjadi cacat fisik maklon/salah varian (Tiket Kategori A), studio langsung memproses cetak ulang prioritas same-day demi mengamankan kepuasan CSAT &gt; 4.80.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-border bg-slate-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-text-muted">Portal Publik:</span>
                <Link
                  href="/pesan"
                  target="_blank"
                  onClick={() => setHelpOpen(false)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-surface-container px-2 py-1 rounded"
                >
                  <span>Form Pesan</span>
                  <span className="text-[10px] font-mono">(/pesan)</span>
                </Link>
                <Link
                  href="/komplain"
                  target="_blank"
                  onClick={() => setHelpOpen(false)}
                  className="text-xs font-bold text-status-danger-text hover:underline flex items-center gap-1 bg-status-danger-surface px-2 py-1 rounded border border-status-danger-border/40"
                >
                  <span>Form Keluhan</span>
                  <span className="text-[10px] font-mono">(/komplain)</span>
                </Link>
                <Link
                  href="/survei"
                  target="_blank"
                  onClick={() => setHelpOpen(false)}
                  className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-200"
                >
                  <span>Survei CSAT</span>
                  <span className="text-[10px] font-mono">(/survei)</span>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-4 py-2 bg-primary-container hover:bg-secondary text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap self-end sm:self-auto"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
