'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Star,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Send,
  Pin,
  ChevronRight,
  ExternalLink,
  Award,
  AlertCircle,
  HelpCircle,
  Check,
  Zap,
  Calendar,
  Lock,
  Users,
  X,
  MessageCircle,
} from 'lucide-react';
import type {
  KPIMetrics,
  FeedbackItem,
} from '@/app/actions/analytics';
import { formatRelativeTime } from '@/lib/formatters';

export interface DormantCustomerItem {
  id: string;
  customerId: string;
  fullName: string;
  socialHandle: string;
  rawPhone: string;
  maskedPhone: string;
  city: string;
  acceptsMarketing: boolean;
  daysInactive: number;
  lastBatch?: string;
  lastOrderDate?: string;
}

interface DashboardClientProps {
  initialData: {
    kpis: KPIMetrics;
    complaintCategories: {
      CATEGORY_A: number;
      CATEGORY_B: number;
      CATEGORY_C: number;
    };
    feedbacks: FeedbackItem[];
    weeklyFRT: Array<{ day: string; frt: number; target: number }>;
    dormantCustomers?: DormantCustomerItem[];
  };
  userRole?: string;
}

export default function DashboardClient({ initialData, userRole }: DashboardClientProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialData.feedbacks);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'five_star' | 'pinned'>('all');
  const [isPending, startTransition] = useTransition();

  // State for Broadcast Promo result
  const [promoNotification, setPromoNotification] = useState<string | null>(null);

  // Toggle Pin Feedback
  const handleTogglePin = (feedbackId: string) => {
    if (!isSuperAdmin) {
      alert('Akses Dibatasi: Hanya Super Admin (Studio Lead) yang berwenang menyematkan ulasan untuk materi media sosial.');
      return;
    }

    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId ? { ...f, isPinnedForSocial: !f.isPinnedForSocial } : f
      )
    );

    startTransition(async () => {
      try {
        const response = await fetch('/api/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_pin', feedbackId }),
        });
        if (!response.ok) {
          throw new Error('Gagal toggle pin di server.');
        }
      } catch (err) {
        alert('Gagal toggle pin: ' + err);
      }
    });
  };

  // Send Promo to Dormant Customers (TOWS S-T S1+T1)
  const [scheduleOption, setScheduleOption] = useState<'IMMEDIATE' | 'BATCH_NEXT' | 'CUSTOM'>('IMMEDIATE');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [promoTemplate, setPromoTemplate] = useState('Halo {nama}! Khusus kamu pelanggan setia Lunarchivve, dapatkan diskon 15% untuk Pre-Order Batch #12 merchandise terbaru!');
  const [isScheduling, startSchedule] = useTransition();

  const handleSchedulePromo = () => {
    if (!isSuperAdmin) {
      alert('Akses Dibatasi: Penjadwalan siaran promo hanya dapat dilakukan oleh Super Admin.');
      return;
    }

    startSchedule(async () => {
      try {
        const response = await fetch('/api/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'schedule_promo',
            batchName: 'Batch #12 Open',
            scheduleOption,
            scheduledDate: scheduleOption === 'CUSTOM' ? scheduledDate : undefined,
            promoTemplate,
          }),
        });
        const res = await response.json();
        setPromoNotification(res.message || 'Siaran promo berhasil dijadwalkan.');
      } catch (err) {
        alert('Gagal menjadwalkan siaran promo: ' + err);
      }
    });
  };

  // Dormant Promo Modal State & List from Database
  const [isDormantModalOpen, setIsDormantModalOpen] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [isDispatchingBatch, setIsDispatchingBatch] = useState(false);
  const dormantList: DormantCustomerItem[] = initialData.dormantCustomers || [];

  const handleOpenDormantModal = () => {
    setModalSuccessMsg(null);
    setIsDormantModalOpen(true);
  };

  const handleExecuteBatchPromo = async () => {
    setIsDispatchingBatch(true);
    setModalSuccessMsg(null);
    try {
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_promo_dormant',
          promoTemplate,
          batchName: 'Batch #12 Open',
        }),
      });
      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || 'Gagal mengirim promo');
      }
      const successText = res.message || 'Siaran promo berhasil dikirim ke seluruh pelanggan pasif!';
      setModalSuccessMsg(successText);
      setPromoNotification(successText);
    } catch (err) {
      alert('Gagal mengirim siaran promo: ' + err);
    } finally {
      setIsDispatchingBatch(false);
    }
  };

  const handleSendPromoDormant = () => {
    handleOpenDormantModal();
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter === 'five_star') return f.rating === 5;
    if (feedbackFilter === 'pinned') return f.isPinnedForSocial;
    return true;
  });

  const pinnedCount = feedbacks.filter((f) => f.isPinnedForSocial).length;

  return (
    <div className="flex flex-col w-full">
      {/* 1. Header Context Bar */}
      <section className="px-8 pt-6 pb-2 flex flex-col gap-4">
        {/* Breadcrumb & Strategy Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-text-muted text-xs">
            <Link href="/dashboard" className="hover:text-slate-text-primary transition-colors cursor-pointer">
              CRM
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-text-primary font-semibold">
              Dashboard KPI Layanan &amp; Ulasan CSAT
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[10px] uppercase tracking-wider font-bold">
              TOWS: S-O (S1+O1) &amp; S-T (S1+T1)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/survei"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container hover:bg-surface-container-high text-primary rounded-full text-xs font-bold transition-all border border-primary/20 cursor-pointer"
              title="Buka form kuesioner survei kepuasan pelanggan di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Form Survei Publik (/survei)</span>
            </Link>
            <div className="flex items-center gap-2 text-channel-whatsapp-text text-xs bg-channel-whatsapp-surface px-3 py-1 rounded-full border border-channel-whatsapp-base/20 font-semibold">
              <ShieldCheck className="w-4 h-4 text-channel-whatsapp-base" />
              <span>Audit CSAT Purnajual Terverifikasi (P12)</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="max-w-3xl">
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
            Dashboard KPI Layanan &amp; Ulasan CSAT
          </h1>
          <p className="text-slate-text-secondary text-sm mt-1">
            Visualisasi metrik operasional studio (FRT, CRT, CSAT, FCR), serta kurasi testimoni pembeli untuk konten promosi media sosial.
          </p>
        </div>

        {/* Promo Notification Alert Banner */}
        {promoNotification && (
          <div className="p-3.5 bg-channel-whatsapp-surface border border-channel-whatsapp-base/30 rounded-xl text-xs font-bold text-channel-whatsapp-text flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-channel-whatsapp-base" />
              <span>{promoNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setPromoNotification(null)}
              className="text-channel-whatsapp-text hover:opacity-75 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 4 Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Avg FRT */}
          <Link
            href="/leads"
            className="bg-slate-card hover:bg-slate-surface/80 hover:border-primary-container/40 transition-all p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between group cursor-pointer"
            title="Buka workbench Leads & First Response Time"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">
                  First Response Time (FRT) →
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.avgFRT.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">Menit</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-status-success-text bg-status-success-surface px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> On Track
              </span>
              <span className="text-slate-text-muted">Target: &lt;15m</span>
            </div>
          </Link>

          {/* Card 2: Avg CRT */}
          <Link
            href="/support"
            className="bg-slate-card hover:bg-slate-surface/80 hover:border-primary-container/40 transition-all p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between group cursor-pointer"
            title="Buka workbench Tiket Keluhan & Resolusi (CRT)"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">
                  Customer Resolution (CRT) →
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.avgCRT.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">Jam</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-status-success-surface flex items-center justify-center text-status-success-text group-hover:bg-status-success-base group-hover:text-white transition-colors">
                <CheckCircle2 className="w-4 h-4 text-status-success-base group-hover:text-white" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-channel-whatsapp-text bg-channel-whatsapp-surface px-2 py-0.5 rounded-full">
                Optimal
              </span>
              <span className="text-slate-text-muted">Target: &lt;4.0 Jam</span>
            </div>
          </Link>

          {/* Card 3: CSAT Score */}
          <a
            href="#csat-curation"
            className="bg-slate-card hover:bg-slate-surface/80 hover:border-primary-container/40 transition-all p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between group cursor-pointer"
            title="Lihat feed ulasan kepuasan pelanggan (CSAT)"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">
                  CSAT Satisfaction ↓
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.csatScore.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">/ 5.0</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-tier-vip-surface flex items-center justify-center text-tier-vip-text group-hover:bg-tier-vip-base group-hover:text-white transition-colors">
                <Star className="w-4 h-4 text-tier-vip-base fill-tier-vip-base group-hover:text-white group-hover:fill-white" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-primary bg-surface-container px-2 py-0.5 rounded-full">
                {initialData.kpis.csatScore.diffBaseline}
              </span>
              <span className="text-slate-text-muted">Target: &gt;4.50</span>
            </div>
          </a>

          {/* Card 4: First Contact Resolution */}
          <Link
            href="/pipeline"
            className="bg-slate-card hover:bg-slate-surface/80 hover:border-primary-container/40 transition-all p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between group cursor-pointer"
            title="Buka alur kerja pipeline pesanan PO"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">
                  First Contact Resolution →
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.fcrRatio.value}%
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">FCR</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-channel-web-surface flex items-center justify-center text-channel-web-text group-hover:bg-channel-web-base group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4 text-channel-web-base group-hover:text-white" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-status-success-text bg-status-success-surface px-2 py-0.5 rounded-full">
                Exceeds Target
              </span>
              <span className="text-slate-text-muted">Target: &gt;85%</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 2. Middle Visualizations: 2 Columns */}
      <section className="px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Chart: Weekly FRT vs Target Threshold (7 cols / 58%) */}
        <div className="lg:col-span-7 bg-slate-card p-6 rounded-2xl border border-slate-border shadow-xs flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                <h2 className="text-base font-bold text-slate-text-primary">
                  Tren Mingguan FRT vs Batas SLA (Menit)
                </h2>
              </div>
              <p className="text-xs text-slate-text-muted mt-0.5">
                Monitoring kecepatan respon WhatsApp &amp; Instagram DM selama Batch #12
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-text-secondary">
                <span className="w-3 h-0.5 bg-primary-container" /> Realisasi FRT
              </span>
              <span className="flex items-center gap-1 text-status-danger-text">
                <span className="w-3 h-0.5 bg-status-danger-base" /> Batas SLA (15m)
              </span>
            </div>
          </div>

          {/* SVG Visual Chart */}
          <div className="w-full bg-slate-surface p-4 rounded-xl border border-slate-border relative">
            {/* SLA Line at 15m indicator */}
            <div className="w-full border-b border-dashed border-status-danger-base/60 my-1 relative">
              <span className="absolute -top-3 right-0 text-[10px] font-bold text-status-danger-text bg-status-danger-surface px-1.5 rounded">
                Batas SLA: 15.0 Menit
              </span>
            </div>

            {/* Weekly Bars / Dots Chart */}
            <div className="grid grid-cols-7 gap-2 pt-6 items-end h-44">
              {initialData.weeklyFRT.map((point) => {
                const heightPercent = Math.min(100, Math.round((point.frt / 20) * 100));
                return (
                  <div key={point.day} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono font-bold text-slate-text-primary">
                      {point.frt}m
                    </span>
                    <div className="w-full max-w-[28px] bg-slate-card rounded-t-lg overflow-hidden border border-slate-border flex items-end h-28">
                      <div
                        className="w-full bg-primary-container hover:bg-secondary transition-all rounded-t"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-text-muted">
                      {point.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-text-muted pt-1 border-t border-slate-border">
            <span>Rata-rata mingguan: <strong>8.5 Menit</strong></span>
            <span className="text-status-success-text font-bold">100% Sesuai SLA Layanan</span>
          </div>
        </div>

        {/* Right Chart: Complaint Breakdown & Guarantees (5 cols / 42%) */}
        <div className="lg:col-span-5 bg-slate-card p-6 rounded-2xl border border-slate-border shadow-xs flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-danger-base" />
              <h2 className="text-base font-bold text-slate-text-primary">
                Distribusi Kategori Keluhan
              </h2>
            </div>
            <p className="text-xs text-slate-text-muted mt-0.5">
              Breakdown keluhan komplain produksi &amp; penanganan (P12)
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Item 1: Cacat Fisik (Category A) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-status-danger-base" />
                  Kategori A: Cacat Fisik / Salah Cetak
                </span>
                <span className="font-bold text-slate-text-primary">
                  {initialData.complaintCategories.CATEGORY_A} Kasus
                </span>
              </div>
              <div className="w-full bg-slate-surface rounded-full h-2 overflow-hidden border border-slate-border">
                <div className="bg-status-danger-base h-2 rounded-full" style={{ width: '35%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-text-muted">
                <span>Garansi Cetak Ulang Gratis</span>
                <span className="text-status-success-text font-bold">Zero Hassle (S1)</span>
              </div>
            </div>

            {/* Item 2: Keterlambatan Ekspedisi (Category B) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-status-warning-base" />
                  Kategori B: Keterlambatan Ekspedisi
                </span>
                <span className="font-bold text-slate-text-primary">
                  {initialData.complaintCategories.CATEGORY_B} Kasus
                </span>
              </div>
              <div className="w-full bg-slate-surface rounded-full h-2 overflow-hidden border border-slate-border">
                <div className="bg-status-warning-base h-2 rounded-full" style={{ width: '40%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-text-muted">
                <span>Eskalasi Hub Transit J&amp;T / SiCepat</span>
                <span className="text-slate-text-secondary">PIC Terjadwal</span>
              </div>
            </div>

            {/* Item 3: Pertanyaan Teknis (Category C) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-channel-web-base" />
                  Kategori C: Pertanyaan Teknis &amp; Status
                </span>
                <span className="font-bold text-slate-text-primary">
                  {initialData.complaintCategories.CATEGORY_C} Kasus
                </span>
              </div>
              <div className="w-full bg-slate-surface rounded-full h-2 overflow-hidden border border-slate-border">
                <div className="bg-channel-web-base h-2 rounded-full" style={{ width: '25%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-text-muted">
                <span>Otomasi Web Portal &amp; Bot FAQ</span>
                <span className="text-status-success-text">FCR Tinggi</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl border border-slate-border flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <p className="text-[11px] text-slate-text-secondary leading-snug">
              Setiap klaim cacat finishing maklon dilindungi klausul <strong className="text-slate-text-primary">Zero Hassle Reprints</strong> untuk mengamankan reputasi dan CSAT &gt; 4.80.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECTION D: Promo PO & Penjadwalan Aktivasi Pelanggan Pasif (P12 / TOWS S-T) */}
      <section className="px-8 pb-10">
        <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container text-primary flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-text-primary">
                  Pengaturan Jadwal Siaran Promo PO &amp; Repeat Order (P12 Roadmap)
                </h2>
                <p className="text-xs text-slate-text-secondary mt-0.5">
                  Aktivasi pelanggan pasif/dormant dengan izin marketing WhatsApp aktif untuk meningkatkan konversi repeat-order.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-status-success-surface text-status-success-text text-xs font-bold border border-status-success-border">
              UU PDP Compliant
            </span>
          </div>

          {!isSuperAdmin && (
            <div className="p-3 bg-slate-surface rounded-xl border border-slate-border flex items-center justify-between text-xs text-slate-text-muted">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-text-muted shrink-0" />
                <span>
                  <strong>Mode Peninjauan Operasional:</strong> Fitur penentuan jadwal dan eksekusi siaran promo hanya dapat dilakukan oleh akun <strong>Super Admin (Studio Lead)</strong>.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-border text-slate-text-secondary whitespace-nowrap">
                Khusus Admin
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Scheduler Form */}
            <div className="lg:col-span-7 flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-text-primary mb-1.5">
                  Pilihan Jadwal Siaran Broadcast PO
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'IMMEDIATE', title: 'Kirim Segera', desc: 'Eksekusi hari ini' },
                    { id: 'BATCH_NEXT', title: 'Batch #13 Open', desc: 'Terjadwal batch depan' },
                    { id: 'CUSTOM', title: 'Pilih Tanggal', desc: 'Kustom kalender siaran' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setScheduleOption(opt.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        scheduleOption === opt.id
                          ? 'bg-surface-container-low border-primary-container text-primary font-bold'
                          : 'bg-slate-surface border-slate-border text-slate-text-secondary hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="block text-slate-text-primary font-bold text-xs">{opt.title}</span>
                        {opt.id === 'CUSTOM' && <Calendar className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <span className="text-[10px] text-slate-text-muted mt-0.5 block">{opt.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Date Picker Interaktif saat opsi CUSTOM (Pilih Tanggal) dipilih */}
                {scheduleOption === 'CUSTOM' && (
                  <div className="mt-3 p-3.5 bg-surface-container-low rounded-xl border border-primary-container/40 animate-in fade-in slide-in-from-top-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>Pilih Tanggal Pelaksanaan Promo PO:</span>
                        </div>
                        <p className="text-[11px] text-slate-text-muted mt-0.5">
                          Tentukan kapan pesan siaran promosi WhatsApp otomatis dieksekusi ke pelanggan dormant.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="px-3 py-2 bg-slate-card border border-slate-border rounded-lg text-xs font-semibold text-slate-text-primary focus:outline-none focus:border-primary-container shadow-xs cursor-pointer"
                        />
                      </div>
                    </div>
                    {/* Preset Cepat Pilihan Tanggal */}
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-border/50 text-[10px] flex-wrap">
                      <span className="text-slate-text-muted font-medium">Preset cepat:</span>
                      {[
                        { label: 'Besok', days: 1 },
                        { label: '+3 Hari', days: 3 },
                        { label: '+1 Minggu', days: 7 },
                        { label: '+2 Minggu (Batch Depan)', days: 14 },
                      ].map((preset) => {
                        const targetD = new Date();
                        targetD.setDate(targetD.getDate() + preset.days);
                        const isoStr = targetD.toISOString().split('T')[0];
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setScheduledDate(isoStr)}
                            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              scheduledDate === isoStr
                                ? 'bg-primary-container text-white font-bold'
                                : 'bg-slate-card text-slate-text-secondary hover:text-primary border border-slate-border'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-text-primary mb-1.5">
                  Template Teks Pesan Promosi WhatsApp
                </label>
                <textarea
                  rows={3}
                  value={promoTemplate}
                  onChange={(e) => setPromoTemplate(e.target.value)}
                  className="w-full p-3 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all leading-relaxed font-sans"
                />
                <span className="text-[11px] text-slate-text-muted mt-1 block">
                  Variabel <code className="text-primary font-mono">&#123;nama&#125;</code> akan otomatis digantikan dengan nama masing-masing pelanggan dormant.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-text-muted">
                  Estimasi target: <strong>Pelanggan pasif dengan izin marketing</strong>
                  {scheduleOption === 'CUSTOM' && scheduledDate && (
                    <span className="ml-1 text-primary font-semibold">
                      (Dijadwalkan:{' '}
                      {new Date(scheduledDate + 'T00:00:00').toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      )
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenDormantModal}
                    className="px-3.5 py-2.5 bg-slate-surface hover:bg-slate-card border border-slate-border text-slate-text-primary font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    title="Buka daftar pelanggan pasif dan editor WhatsApp"
                  >
                    <Users className="w-3.5 h-3.5 text-secondary" />
                    <span>Daftar Target ({dormantList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSchedulePromo}
                    disabled={isScheduling || !isSuperAdmin}
                    title={!isSuperAdmin ? 'Hanya Super Admin yang berwenang mengeksekusi siaran promo' : undefined}
                    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 ${
                      isSuperAdmin
                        ? 'bg-primary-container hover:bg-secondary text-white cursor-pointer'
                        : 'bg-slate-surface border border-slate-border text-slate-text-muted cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isScheduling ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menjadwalkan...</span>
                      </>
                    ) : (
                      <>
                        {isSuperAdmin ? <Send className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{isSuperAdmin ? 'Jadwalkan & Eksekusi Siaran' : 'Terkunci (Super Admin)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Response Tracker */}
            <div className="lg:col-span-5 bg-slate-surface p-5 rounded-xl border border-slate-border flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-text-primary uppercase tracking-wider mb-3">
                  Pelacakan Status Respons Pelanggan (Funnel PO)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-text-secondary font-medium">1. Pesan Terkirim Sukses</span>
                      <span className="font-bold text-slate-text-primary">100%</span>
                    </div>
                    <div className="w-full bg-slate-border rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary-container h-1.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-text-secondary font-medium">2. Pesan Dibaca / Dibalas</span>
                      <span className="font-bold text-slate-text-primary">68%</span>
                    </div>
                    <div className="w-full bg-slate-border rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-text-secondary font-medium">3. Konversi Jadi Pesanan PO Baru</span>
                      <span className="font-bold text-status-success-text">34% (Target &gt; 25%)</span>
                    </div>
                    <div className="w-full bg-slate-border rounded-full h-1.5 overflow-hidden">
                      <div className="bg-status-success-base h-1.5 rounded-full" style={{ width: '34%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-text-secondary font-medium">4. Keluhan / Opt-Out Stop Promo</span>
                      <span className="font-bold text-slate-text-muted">0% (Sesuai UU PDP)</span>
                    </div>
                    <div className="w-full bg-slate-border rounded-full h-1.5 overflow-hidden">
                      <div className="bg-slate-border h-1.5 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-border text-[11px] text-slate-text-secondary flex items-center justify-between">
                <span>Algoritma: TOWS S-T (S1+T1)</span>
                <span className="font-mono text-status-success-text font-bold">Lolos Uji Audit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Section: Post-Purchase CSAT Feed & Testimonial Selector (TOWS S-O & S-T Execution) */}
      <section id="csat-curation" className="px-8 pb-8 scroll-mt-20">
        <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-6 flex flex-col gap-6">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-border">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-container" />
                <h2 className="text-lg font-bold text-slate-text-primary">
                  Kurasi Ulasan CSAT &amp; Testimonial Showcase
                </h2>
              </div>
              <p className="text-xs text-slate-text-secondary mt-1 max-w-2xl">
                Kurasi testimoni pelanggan batch produksi untuk materi promosi media sosial (<span className="font-bold text-primary">Strategi S-O: S1+O1</span>) dan aktifkan retargeting promo ke pelanggan pasif (<span className="font-bold text-status-warning-text">Strategi S-T: S1+T1</span>).
              </p>
            </div>

            {/* TOWS Action: Retargeting Pelanggan Pasif */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleSendPromoDormant}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-channel-whatsapp-base hover:bg-channel-whatsapp-text text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Buka workbench siaran promo retargeting pelanggan pasif (>60 hari)"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Promo PO ke Pelanggan Pasif (&gt;60 hari)</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {dormantList.length}
                </span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Curation Status */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex bg-slate-surface p-1 rounded-lg gap-1 border border-slate-border">
              <button
                type="button"
                onClick={() => setFeedbackFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  feedbackFilter === 'all'
                    ? 'bg-slate-card text-slate-text-primary shadow-2xs'
                    : 'text-slate-text-muted hover:text-slate-text-primary'
                }`}
              >
                Semua Ulasan ({feedbacks.length})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackFilter('five_star')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  feedbackFilter === 'five_star'
                    ? 'bg-slate-card text-slate-text-primary shadow-2xs'
                    : 'text-slate-text-muted hover:text-slate-text-primary'
                }`}
              >
                Rating Bintang 5 ({feedbacks.filter((f) => f.rating === 5).length})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackFilter('pinned')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  feedbackFilter === 'pinned'
                    ? 'bg-slate-card text-slate-text-primary shadow-2xs'
                    : 'text-slate-text-muted hover:text-slate-text-primary'
                }`}
              >
                Tersemat di Medsos ({pinnedCount})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-text-muted">Status Kurasi:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-primary bg-surface-container px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span>{pinnedCount} Ulasan Dipin Siap Tayang (TOWS S-O)</span>
              </span>
            </div>
          </div>

          {/* Testimonial Feed Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeedbacks.map((f) => (
              <div
                key={f.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs transition-all ${
                  f.isPinnedForSocial
                    ? 'bg-slate-card border-primary/40 ring-1 ring-primary/20'
                    : 'bg-slate-surface border-slate-border hover:border-slate-border-strong'
                }`}
              >
                <div className="flex flex-col gap-2.5">
                  {/* Review Header User & Order ID */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-primary border border-slate-border shrink-0">
                        {f.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-text-primary truncate">
                            {f.customerName}
                          </span>
                          <Award className="w-3.5 h-3.5 text-tier-vip-base shrink-0" />
                        </div>
                        <span className="text-[10px] text-slate-text-muted truncate">
                          {f.socialHandle} • {f.city}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-primary bg-slate-card px-2 py-0.5 rounded border border-slate-border">
                      {f.orderCode}
                    </span>
                  </div>

                  {/* Rating Stars & Product */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 text-tier-vip-base">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < f.rating
                              ? 'fill-tier-vip-base text-tier-vip-base'
                              : 'text-slate-border'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-text-muted truncate max-w-[140px]">
                      {f.productName}
                    </span>
                  </div>

                  {/* Comment Excerpt */}
                  <p className="text-xs text-slate-text-primary italic leading-relaxed">
                    &ldquo;{f.comment}&rdquo;
                  </p>
                </div>

                {/* Footer: Pin to Social Media Toggle Switch (TOWS S-O) */}
                <div className="pt-2.5 border-t border-slate-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Pin
                      className={`w-3.5 h-3.5 ${
                        f.isPinnedForSocial ? 'text-primary' : 'text-slate-text-muted'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-slate-text-secondary">
                      Pin ke Materi Medsos
                    </span>
                  </div>

                  <label
                    className={`relative inline-flex items-center ${
                      isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                    title={!isSuperAdmin ? 'Hanya Super Admin yang berwenang menyematkan ulasan untuk materi medsos' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={f.isPinnedForSocial}
                      onChange={() => handleTogglePin(f.id)}
                      disabled={!isSuperAdmin}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-container" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL: Kirim Promo PO ke Pelanggan Pasif (>60 Hari) */}
      {isDormantModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-channel-whatsapp-surface border border-channel-whatsapp-base/30 text-channel-whatsapp-base flex items-center justify-center">
                  <Send className="w-5 h-5 text-channel-whatsapp-base" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary flex items-center gap-2">
                    <span>Siaran Promo Retargeting Pelanggan Pasif (&gt;60 Hari)</span>
                    <span className="px-2 py-0.5 rounded-full bg-channel-whatsapp-surface text-channel-whatsapp-text text-[10px] font-bold border border-channel-whatsapp-base/20">
                      TOWS S-T (S1+T1)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-text-muted mt-0.5">
                    Kirim pesan penawaran eksklusif PO Batch #12 ke pelanggan yang belum bertransaksi ulang &gt;60 hari (Kepatuhan UU PDP No. 27/2022).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDormantModalOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary p-1 rounded-lg hover:bg-slate-card transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs text-slate-text-secondary">
              {/* Success Alert Banner if sent */}
              {modalSuccessMsg && (
                <div className="p-3.5 bg-channel-whatsapp-surface border border-channel-whatsapp-base/30 rounded-xl text-xs font-bold text-channel-whatsapp-text flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-channel-whatsapp-base shrink-0" />
                    <span>{modalSuccessMsg}</span>
                  </div>
                  <Link
                    href="/leads"
                    className="text-[11px] underline text-channel-whatsapp-text hover:opacity-80"
                  >
                    Buka Log Leads →
                  </Link>
                </div>
              )}

              {/* Stat Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-surface rounded-xl border border-slate-border">
                  <span className="text-[11px] text-slate-text-muted block mb-1">Total Pelanggan Pasif</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-slate-text-primary">{dormantList.length}</span>
                    <span className="text-[10px] text-slate-text-muted">&gt;60 hari inaktif</span>
                  </div>
                </div>
                <div className="p-3 bg-channel-whatsapp-surface/40 rounded-xl border border-channel-whatsapp-base/20">
                  <span className="text-[11px] text-channel-whatsapp-text block mb-1">Opt-In Siap Dikirim</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-channel-whatsapp-text">
                      {dormantList.filter((c) => c.acceptsMarketing).length}
                    </span>
                    <span className="text-[10px] text-channel-whatsapp-text/80">Izin marketing aktif</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-surface rounded-xl border border-slate-border">
                  <span className="text-[11px] text-slate-text-muted block mb-1">Perlindungan UU PDP</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-slate-text-primary">
                      {dormantList.filter((c) => !c.acceptsMarketing).length}
                    </span>
                    <span className="text-[10px] text-slate-text-muted">Opt-out dilindungi</span>
                  </div>
                </div>
              </div>

              {/* Message Template Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-text-primary text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Template Pesan WhatsApp Promosi:</span>
                  </label>
                  <span className="text-[11px] text-slate-text-muted">
                    Gunakan tag <code className="text-primary font-mono bg-slate-surface px-1 py-0.5 rounded">&#123;nama&#125;</code>
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={promoTemplate}
                  onChange={(e) => setPromoTemplate(e.target.value)}
                  placeholder="Ketik template pesan siaran promo..."
                  className="w-full p-3 bg-slate-surface border border-slate-border rounded-xl text-xs text-slate-text-primary focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all leading-relaxed"
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-text-muted font-medium">Pilihan template cepat:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPromoTemplate(
                        'Halo {nama}! Khusus kamu pelanggan setia Lunarchivve, dapatkan diskon 15% untuk Pre-Order Batch #12 merchandise terbaru! Balas pesan ini untuk klaim voucher diskon kamu ya ✨'
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded bg-slate-surface hover:bg-slate-border border border-slate-border text-slate-text-secondary cursor-pointer"
                  >
                    Diskon 15% Batch #12
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPromoTemplate(
                        'Halo {nama}! Kangen buat merchandise unik? Ada promo GRATIS ONGKIR + Free Keychain Mini khusus repeat-order kamu di Batch #12 minggu ini 🎁'
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded bg-slate-surface hover:bg-slate-border border border-slate-border text-slate-text-secondary cursor-pointer"
                  >
                    Gratis Ongkir + Keychain
                  </button>
                </div>
              </div>

              {/* Target Customer Cards List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-text-primary text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-secondary" />
                    <span>Daftar Target Pelanggan Pasif (&gt;60 Hari):</span>
                  </h4>
                  <span className="text-[11px] text-slate-text-muted">
                    {dormantList.length} Pelanggan Terdaftar
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {dormantList.map((cust) => {
                    const cleanPhone = cust.rawPhone.replace(/^0/, '62').replace(/[^0-9]/g, '');
                    const personalizedMessage = promoTemplate.replace(/{nama}/g, cust.fullName);
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalizedMessage)}`;

                    return (
                      <div
                        key={cust.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                          cust.acceptsMarketing
                            ? 'bg-slate-card border-slate-border hover:border-channel-whatsapp-base/40'
                            : 'bg-slate-surface/40 border-slate-border/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              cust.acceptsMarketing
                                ? 'bg-channel-whatsapp-surface text-channel-whatsapp-text border border-channel-whatsapp-base/20'
                                : 'bg-slate-border text-slate-text-muted'
                            }`}
                          >
                            {cust.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-text-primary text-xs">
                                {cust.fullName}
                              </span>
                              <span className="text-[11px] text-slate-text-muted">
                                {cust.socialHandle}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                {cust.daysInactive} hari lalu
                              </span>
                              {cust.lastBatch && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-surface text-slate-text-secondary border border-slate-border font-medium">
                                  {cust.lastBatch}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-text-muted mt-0.5">
                              <span>{cust.maskedPhone}</span>
                              <span>•</span>
                              <span>{cust.city}</span>
                              <span>•</span>
                              {cust.acceptsMarketing ? (
                                <span className="text-channel-whatsapp-text font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-channel-whatsapp-base" />
                                  Opt-in Aktif
                                </span>
                              ) : (
                                <span className="text-slate-text-muted italic">
                                  Opt-out (PDP Protected)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action per Customer */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {cust.acceptsMarketing ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-channel-whatsapp-surface hover:bg-channel-whatsapp-base hover:text-white text-channel-whatsapp-text font-bold text-xs border border-channel-whatsapp-base/30 transition-all cursor-pointer"
                              title={`Kirim pesan WhatsApp langsung ke ${cust.fullName}`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirim Chat WA</span>
                            </a>
                          ) : (
                            <span className="text-[10px] px-2 py-1 rounded bg-slate-border text-slate-text-muted font-medium">
                              Tidak Diizinkan
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-border bg-slate-surface flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-text-muted">
                Diproses dengan identitas PIC aktif untuk Audit Log.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsDormantModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-card hover:bg-slate-border border border-slate-border text-slate-text-primary text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBatchPromo}
                  disabled={isDispatchingBatch || dormantList.filter((c) => c.acceptsMarketing).length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-channel-whatsapp-base hover:bg-channel-whatsapp-text text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isDispatchingBatch ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyiarkan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        Kirim Siaran ke Semua ({dormantList.filter((c) => c.acceptsMarketing).length}) &amp; Catat Log
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
