'use client';

import React, { useState, useTransition } from 'react';
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
} from 'lucide-react';
import {
  KPIMetrics,
  FeedbackItem,
  togglePinFeedback,
  sendPromoToDormant,
} from '@/app/actions/analytics';
import { schedulePromoBroadcast } from '@/app/actions/messages';
import { formatRelativeTime } from '@/lib/formatters';

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
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialData.feedbacks);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'five_star' | 'pinned'>('all');
  const [isPending, startTransition] = useTransition();

  // State for Broadcast Promo result
  const [promoNotification, setPromoNotification] = useState<string | null>(null);

  // Toggle Pin Feedback
  const handleTogglePin = (feedbackId: string) => {
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId ? { ...f, isPinnedForSocial: !f.isPinnedForSocial } : f
      )
    );

    startTransition(async () => {
      try {
        await togglePinFeedback(feedbackId);
      } catch (err) {
        alert('Gagal toggle pin: ' + err);
      }
    });
  };

  // Send Promo to Dormant Customers (TOWS S-T S1+T1)
  const [scheduleOption, setScheduleOption] = useState<'IMMEDIATE' | 'BATCH_NEXT' | 'CUSTOM'>('IMMEDIATE');
  const [promoTemplate, setPromoTemplate] = useState('Halo {nama}! Khusus kamu pelanggan setia Lunarchivve, dapatkan diskon 15% untuk Pre-Order Batch #12 merchandise terbaru!');
  const [isScheduling, startSchedule] = useTransition();

  const handleSchedulePromo = () => {
    startSchedule(async () => {
      try {
        const res = await schedulePromoBroadcast({
          batchName: 'Batch #12 Open',
          scheduleOption,
          promoTemplate,
        });
        setPromoNotification(res.message);
      } catch (err) {
        alert('Gagal menjadwalkan siaran promo: ' + err);
      }
    });
  };

  const handleSendPromoDormant = () => {
    startTransition(async () => {
      try {
        const res = await sendPromoToDormant();
        setPromoNotification(res.message);
      } catch (err) {
        alert('Gagal mengirim promo: ' + err);
      }
    });
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
            <span className="hover:text-slate-text-primary transition-colors cursor-pointer">
              CRM
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-text-primary font-semibold">
              Dashboard KPI Layanan &amp; Ulasan CSAT
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[10px] uppercase tracking-wider font-bold">
              TOWS: S-O (S1+O1) &amp; S-T (S1+T1)
            </span>
          </div>

          <div className="flex items-center gap-2 text-channel-whatsapp-text text-xs bg-channel-whatsapp-surface px-3 py-1 rounded-full border border-channel-whatsapp-base/20 font-semibold">
            <ShieldCheck className="w-4 h-4 text-channel-whatsapp-base" />
            <span>Audit CSAT Purnajual Terverifikasi (P12)</span>
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
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                  First Response Time (FRT)
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.avgFRT.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">Menit</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-status-success-text bg-status-success-surface px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> On Track
              </span>
              <span className="text-slate-text-muted">Target: &lt;15m</span>
            </div>
          </div>

          {/* Card 2: Avg CRT */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                  Customer Resolution (CRT)
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.avgCRT.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">Jam</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-status-success-surface flex items-center justify-center text-status-success-text">
                <CheckCircle2 className="w-4 h-4 text-status-success-base" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-channel-whatsapp-text bg-channel-whatsapp-surface px-2 py-0.5 rounded-full">
                Optimal
              </span>
              <span className="text-slate-text-muted">Target: &lt;4.0 Jam</span>
            </div>
          </div>

          {/* Card 3: CSAT Score */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                  CSAT Satisfaction
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.csatScore.value}
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">/ 5.0</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-tier-vip-surface flex items-center justify-center text-tier-vip-text">
                <Star className="w-4 h-4 text-tier-vip-base fill-tier-vip-base" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-primary bg-surface-container px-2 py-0.5 rounded-full">
                {initialData.kpis.csatScore.diffBaseline}
              </span>
              <span className="text-slate-text-muted">Target: &gt;4.50</span>
            </div>
          </div>

          {/* Card 4: First Contact Resolution */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                  First Contact Resolution
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-slate-text-primary">
                    {initialData.kpis.fcrRatio.value}%
                  </span>
                  <span className="text-xs text-slate-text-secondary font-medium">FCR</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-channel-web-surface flex items-center justify-center text-channel-web-text">
                <TrendingUp className="w-4 h-4 text-channel-web-base" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 bg-slate-surface rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-border/50">
              <span className="inline-flex items-center gap-1 font-bold text-status-success-text bg-status-success-surface px-2 py-0.5 rounded-full">
                Exceeds Target
              </span>
              <span className="text-slate-text-muted">Target: &gt;85%</span>
            </div>
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
                    { id: 'CUSTOM', title: 'Kustom Kalender', desc: 'Pilih tanggal manual' },
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
                      <span className="block text-slate-text-primary font-bold text-xs">{opt.title}</span>
                      <span className="text-[10px] text-slate-text-muted mt-0.5 block">{opt.desc}</span>
                    </div>
                  ))}
                </div>
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
                </span>

                <button
                  type="button"
                  onClick={handleSchedulePromo}
                  disabled={isScheduling}
                  className="px-5 py-2.5 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isScheduling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menjadwalkan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Jadwalkan &amp; Eksekusi Siaran</span>
                    </>
                  )}
                </button>
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
                    { id: 'CUSTOM', title: 'Kustom Kalender', desc: 'Pilih tanggal manual' },
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
                      <span className="block text-slate-text-primary font-bold text-xs">{opt.title}</span>
                      <span className="text-[10px] text-slate-text-muted mt-0.5 block">{opt.desc}</span>
                    </div>
                  ))}
                </div>
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
                </span>

                <button
                  type="button"
                  onClick={handleSchedulePromo}
                  disabled={isScheduling}
                  className="px-5 py-2.5 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isScheduling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menjadwalkan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Jadwalkan &amp; Eksekusi Siaran</span>
                    </>
                  )}
                </button>
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
      <section className="px-8 pb-8">
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
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-channel-whatsapp-base hover:bg-channel-whatsapp-text text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Promo PO ke Pelanggan Pasif (&gt;60 hari)</span>
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

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.isPinnedForSocial}
                      onChange={() => handleTogglePin(f.id)}
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
                    { id: 'CUSTOM', title: 'Kustom Kalender', desc: 'Pilih tanggal manual' },
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
                      <span className="block text-slate-text-primary font-bold text-xs">{opt.title}</span>
                      <span className="text-[10px] text-slate-text-muted mt-0.5 block">{opt.desc}</span>
                    </div>
                  ))}
                </div>
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
                </span>

                <button
                  type="button"
                  onClick={handleSchedulePromo}
                  disabled={isScheduling}
                  className="px-5 py-2.5 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isScheduling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menjadwalkan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Jadwalkan &amp; Eksekusi Siaran</span>
                    </>
                  )}
                </button>
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
    </div>
  );
}
