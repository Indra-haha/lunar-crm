'use client';

import React, { useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  PackageCheck,
  RotateCcw,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  FileText,
  User,
  Phone,
  CheckCircle,
} from 'lucide-react';
import {
  lookupOrderForComplaint,
  submitPublicComplaint,
  lookupPublicTicket,
} from '@/app/actions/support';
import type { TicketCategory } from '@/models/SupportTicket';

interface VerifiedOrder {
  id: string;
  orderCode: string;
  productName: string;
  variantName: string;
  quantity: number;
  batchName: string;
  pipelineStatus: string;
  customerName: string;
  maskedPhone: string;
}

interface TrackedTicket {
  ticketCode: string;
  category: string;
  categoryLabel: string;
  issueDetail: string;
  assignedPIC: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  resolvedAt: string | null;
  orderCode: string;
  productName: string;
  customerName: string;
  maskedPhone: string;
}

function ComplaintPublicPortal() {
  // Navigation Tab: 'submit' | 'track'
  const [activeTab, setActiveTab] = useState<'submit' | 'track'>('submit');

  // === TAB 1: FORM SUBMIT STATES ===
  const [orderQuery, setOrderQuery] = useState('');
  const [isLookingUp, startLookup] = useTransition();
  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedOrder | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [category, setCategory] = useState<TicketCategory>('CATEGORY_A');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [issueDetail, setIssueDetail] = useState('');
  const [photoProofUrl, setPhotoProofUrl] = useState('');
  const [expectedResolution, setExpectedResolution] = useState('Cetak Ulang Same-Day (Zero Hassle Reprint)');

  const [isSubmitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState('');
  const [ticketResult, setTicketResult] = useState<{
    ticketCode: string;
    createdAt: string;
    assignedPIC: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // === TAB 2: TICKET TRACKING STATES ===
  const [trackQuery, setTrackQuery] = useState('');
  const [isTracking, startTrack] = useTransition();
  const [trackedTicket, setTrackedTicket] = useState<TrackedTicket | null>(null);
  const [trackMessage, setTrackMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Order Lookup Handler
  const handleLookupOrder = () => {
    if (!orderQuery.trim()) {
      setLookupMessage({ type: 'error', text: 'Masukkan kode pesanan (misal: #LUN-ORD-001) atau nomor HP.' });
      return;
    }

    setLookupMessage(null);
    startLookup(async () => {
      try {
        const res = await lookupOrderForComplaint(orderQuery);
        if (res.found && res.order) {
          setVerifiedOrder(res.order);
          setCustomerName(res.order.customerName);
          setLookupMessage({
            type: 'success',
            text: `Pesanan ditemukan: ${res.order.orderCode} (${res.order.productName})`,
          });
        } else {
          setVerifiedOrder(null);
          setLookupMessage({
            type: 'error',
            text: 'Pesanan tidak ditemukan di database. Anda tetap dapat melanjutkan pengisian form secara manual.',
          });
        }
      } catch (err) {
        console.error(err);
        setLookupMessage({ type: 'error', text: 'Gagal mencari pesanan. Coba sesaat lagi.' });
      }
    });
  };

  // Submit Complaint Handler
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!issueDetail.trim()) {
      setSubmitError('Harap jelaskan kendala atau kerusakan yang Anda temui secara detail.');
      return;
    }

    if (!customerName.trim()) {
      setSubmitError('Nama pemesan / pelapor wajib diisi.');
      return;
    }

    startSubmit(async () => {
      try {
        const result = await submitPublicComplaint({
          orderCode: verifiedOrder ? verifiedOrder.orderCode : orderQuery.trim() || 'LOOKUP-PELANGGAN',
          orderId: verifiedOrder?.id,
          customerName: customerName.trim(),
          phone: phone.trim(),
          category,
          issueDetail,
          photoProofUrl,
          expectedResolution,
        });

        if (result.success) {
          setTicketResult({
            ticketCode: result.ticketCode,
            createdAt: result.createdAt,
            assignedPIC: result.assignedPIC,
          });
        }
      } catch (err: unknown) {
        console.error(err);
        setSubmitError((err as Error).message || 'Gagal mengirimkan tiket keluhan. Coba beberapa saat lagi.');
      }
    });
  };

  // Track Ticket Handler
  const handleTrackTicket = () => {
    if (!trackQuery.trim()) {
      setTrackMessage({ type: 'error', text: 'Masukkan kode tiket Anda (contoh: #LUN-TK-001).' });
      return;
    }

    setTrackMessage(null);
    startTrack(async () => {
      try {
        const res = await lookupPublicTicket(trackQuery);
        if (res.found && res.ticket) {
          setTrackedTicket(res.ticket as TrackedTicket);
          setTrackMessage({ type: 'success', text: `Tiket ${res.ticket.ticketCode} ditemukan!` });
        } else {
          setTrackedTicket(null);
          setTrackMessage({
            type: 'error',
            text: `Tiket dengan kode "${trackQuery}" tidak ditemukan. Pastikan format penulisan benar.`,
          });
        }
      } catch (err) {
        console.error(err);
        setTrackMessage({ type: 'error', text: 'Terjadi gangguan saat melacak tiket. Coba beberapa saat lagi.' });
      }
    });
  };

  const handleCopyCode = () => {
    if (ticketResult?.ticketCode) {
      navigator.clipboard.writeText(ticketResult.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setTicketResult(null);
    setVerifiedOrder(null);
    setOrderQuery('');
    setIssueDetail('');
    setPhotoProofUrl('');
    setLookupMessage(null);
    setCustomerName('');
    setPhone('');
  };

  return (
    <div className="min-h-screen bg-background text-slate-text-primary flex flex-col justify-between">
      {/* Top Customer Portal Header */}
      <header className="w-full bg-slate-card border-b border-slate-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm shadow-primary/20">
              <Sparkles className="w-5 h-5 text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-title-sm text-[15px] font-bold text-slate-text-primary tracking-tight">
                Lunarchivve
              </span>
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Pusat Bantuan &amp; Klaim Garansi Publik
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-status-success-text bg-status-success-surface px-3 py-1 rounded-full border border-status-success-border">
              <ShieldCheck className="w-3.5 h-3.5 text-status-success-base" />
              <span>Zero Hassle Reprints</span>
            </div>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-text-secondary hover:text-slate-text-primary flex items-center gap-1"
            >
              <span>Portal Admin</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-6 py-8 flex-1">
        {/* Navigation Tabs (Ajukan Keluhan vs Lacak Status) */}
        {!ticketResult && (
          <div className="flex items-center justify-center mb-6">
            <div className="bg-slate-surface p-1 rounded-xl border border-slate-border inline-flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'submit'
                    ? 'bg-primary-container text-white shadow-xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Keluhan Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'track'
                    ? 'bg-primary-container text-white shadow-xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Lacak Status Tiket</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: Confirmation Voucher If Submitted */}
        {ticketResult ? (
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-8 sm:p-10 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-status-success-surface border border-status-success-border text-status-success-base flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-2">
                Tiket Keluhan Resmi Diterbitkan
              </span>
              <h2 className="text-2xl font-bold text-slate-text-primary tracking-tight font-headline-lg">
                Laporan Anda Telah Terdaftar di Sistem
              </h2>
              <p className="text-xs text-slate-text-secondary mt-2 leading-relaxed">
                Tim Quality Assurance (QA) dan purnajual Lunarchivve sedang memverifikasi laporan keluhan Anda. Kami berkomitmen memberikan solusi dalam batas SLA target &lt; 30 menit.
              </p>
            </div>

            {/* Official Ticket Card Receipt */}
            <div className="max-w-lg mx-auto bg-slate-surface rounded-xl border border-slate-border p-6 mb-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-border">
                <div>
                  <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                    Kode Tiket Keluhan
                  </span>
                  <div className="text-xl font-mono font-bold text-primary mt-0.5">
                    {ticketResult.ticketCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-card border border-slate-border hover:bg-surface-container-low text-xs font-semibold text-slate-text-primary flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-status-success-base" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-text-muted" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-border text-xs">
                <div>
                  <span className="text-slate-text-muted text-[11px]">Penanggung Jawab (PIC):</span>
                  <p className="font-semibold text-slate-text-primary mt-0.5">
                    {ticketResult.assignedPIC} (QA Lead)
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Status Penanganan:</span>
                  <p className="font-semibold text-status-warning-text mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-warning-base animate-pulse" />
                    OPEN (Dalam Antrean)
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Kategori Klaim:</span>
                  <p className="font-semibold text-slate-text-primary mt-0.5">
                    {category === 'CATEGORY_A'
                      ? 'Cacat Fisik / Salah Cetak'
                      : category === 'CATEGORY_B'
                      ? 'Keterlambatan Ekspedisi'
                      : 'Pertanyaan Teknis'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Estimasi Respon Pertama:</span>
                  <p className="font-semibold text-status-success-text mt-0.5">
                    &lt; 30 Menit (SLA Purnajual)
                  </p>
                </div>
              </div>

              <div className="pt-4 text-[11px] text-slate-text-secondary leading-snug">
                💡 <span className="font-semibold text-slate-text-primary">Klausul Zero Hassle:</span> Jika barang terbukti cacat cetak maklon atau resin buram, pesanan Anda akan langsung diproses cetak ulang same-day tanpa biaya tambahan.
              </div>
            </div>

            {/* Next Action Buttons */}
            <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/6281298448821?text=${encodeURIComponent(
                  `Halo Admin Lunarchivve CS, saya telah mengajukan laporan keluhan dengan Kode Tiket: ${ticketResult.ticketCode}. Mohon bantuan tindak lanjutnya ya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-channel-whatsapp-base hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Buka WhatsApp CS Lunarchivve</span>
              </a>
              <button
                type="button"
                onClick={resetForm}
                className="py-3 px-4 bg-slate-surface hover:bg-surface-container-low border border-slate-border text-slate-text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-text-muted" />
                <span>Kirim Keluhan Lainnya</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'track' ? (
          /* VIEW 2: PUBLIC TICKET TRACKING */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-6 sm:p-10 animate-in fade-in">
            <div className="border-b border-slate-border pb-6 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <Search className="w-3.5 h-3.5" />
                <span>Pelacakan Tiket Layanan Purnajual</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-text-primary tracking-tight font-headline-xl">
                Lacak Status Penanganan Tiket Anda
              </h1>
              <p className="text-xs sm:text-sm text-slate-text-secondary mt-1.5 leading-relaxed max-w-2xl">
                Masukkan Kode Tiket yang Anda peroleh saat mengajukan laporan keluhan untuk melihat perkembangan terkini dari tim kami secara transparan.
              </p>
            </div>

            {/* Tracking Search Input */}
            <div className="max-w-xl mx-auto mb-8">
              <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                Kode Tiket Keluhan
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTrackTicket();
                      }
                    }}
                    placeholder="Contoh: #LUN-TK-001"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTrackTicket}
                  disabled={isTracking}
                  className="px-5 py-2.5 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTracking ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Melacak...</span>
                    </>
                  ) : (
                    <>
                      <span>Lacak Tiket</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {trackMessage && (
                <p
                  className={`text-[11px] mt-2 font-medium flex items-center gap-1.5 ${
                    trackMessage.type === 'success'
                      ? 'text-status-success-text'
                      : 'text-status-danger-text'
                  }`}
                >
                  {trackMessage.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-status-success-base" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-status-danger-base" />
                  )}
                  <span>{trackMessage.text}</span>
                </p>
              )}
            </div>

            {/* Tracked Ticket Results Card */}
            {trackedTicket && (
              <div className="max-w-2xl mx-auto bg-slate-surface rounded-2xl border border-slate-border p-6 sm:p-8 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-border">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                      Tiket Terdaftar
                    </span>
                    <h3 className="text-xl font-mono font-bold text-primary">
                      {trackedTicket.ticketCode}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {trackedTicket.status === 'RESOLVED' ? (
                      <span className="px-3 py-1 rounded-full bg-status-success-surface border border-status-success-border text-status-success-text text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-status-success-base" />
                        <span>RESOLVED (Selesai Ditangani)</span>
                      </span>
                    ) : trackedTicket.status === 'IN_PROGRESS' ? (
                      <span className="px-3 py-1 rounded-full bg-status-warning-surface border border-status-warning-border text-status-warning-text text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-warning-base animate-pulse" />
                        <span>IN PROGRESS (Sedang Diproses)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-surface-container border border-primary/20 text-primary text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>OPEN (Menunggu Antrean QA)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stepper Timeline */}
                <div className="py-6 border-b border-slate-border">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs mb-1">
                        1
                      </div>
                      <span className="font-bold text-slate-text-primary">Tiket Diterima</span>
                      <span className="text-[10px] text-slate-text-muted">
                        {new Date(trackedTicket.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          trackedTicket.status === 'IN_PROGRESS' || trackedTicket.status === 'RESOLVED'
                            ? 'bg-primary-container text-white'
                            : 'bg-slate-card border border-slate-border text-slate-text-muted'
                        }`}
                      >
                        2
                      </div>
                      <span
                        className={`font-bold ${
                          trackedTicket.status === 'IN_PROGRESS' || trackedTicket.status === 'RESOLVED'
                            ? 'text-slate-text-primary'
                            : 'text-slate-text-muted'
                        }`}
                      >
                        Investigasi QA
                      </span>
                      <span className="text-[10px] text-slate-text-muted">
                        {trackedTicket.assignedPIC}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                          trackedTicket.status === 'RESOLVED'
                            ? 'bg-status-success-base text-white'
                            : 'bg-slate-card border border-slate-border text-slate-text-muted'
                        }`}
                      >
                        3
                      </div>
                      <span
                        className={`font-bold ${
                          trackedTicket.status === 'RESOLVED'
                            ? 'text-status-success-text'
                            : 'text-slate-text-muted'
                        }`}
                      >
                        Solusi Selesai
                      </span>
                      <span className="text-[10px] text-slate-text-muted">
                        {trackedTicket.resolvedAt
                          ? new Date(trackedTicket.resolvedAt).toLocaleDateString('id-ID')
                          : 'Dalam Proses'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs border-b border-slate-border">
                  <div>
                    <span className="text-slate-text-muted text-[11px]">Kategori Laporan:</span>
                    <p className="font-semibold text-slate-text-primary mt-0.5">
                      {trackedTicket.categoryLabel}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-text-muted text-[11px]">Referensi Pesanan:</span>
                    <p className="font-semibold text-slate-text-primary mt-0.5">
                      {trackedTicket.orderCode} ({trackedTicket.productName})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-text-muted text-[11px]">Nama Pemesan:</span>
                    <p className="font-semibold text-slate-text-primary mt-0.5">
                      {trackedTicket.customerName} ({trackedTicket.maskedPhone})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-text-muted text-[11px]">PIC Penanggung Jawab:</span>
                    <p className="font-semibold text-slate-text-primary mt-0.5">
                      {trackedTicket.assignedPIC} (Quality Assurance)
                    </p>
                  </div>
                </div>

                <div className="pt-4 text-xs">
                  <span className="text-slate-text-muted text-[11px] block mb-1">
                    Catatan Rincian Keluhan:
                  </span>
                  <div className="p-3 bg-slate-card rounded-lg border border-slate-border text-slate-text-secondary whitespace-pre-line leading-relaxed">
                    {trackedTicket.issueDetail}
                  </div>
                </div>

                {/* WhatsApp CS Link */}
                <div className="mt-6 pt-5 border-t border-slate-border flex justify-end">
                  <a
                    href={`https://wa.me/6281298448821?text=${encodeURIComponent(
                      `Halo Tim Lunarchivve, saya ingin menanyakan perkembangan tindak lanjut Tiket: ${trackedTicket.ticketCode}. Terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 bg-channel-whatsapp-base hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Hubungi CS Terkait Tiket Ini</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 3: COMPLAINT SUBMISSION FORM */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-6 sm:p-10">
            {/* Form Banner */}
            <div className="border-b border-slate-border pb-6 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <FileText className="w-3.5 h-3.5" />
                <span>Formulir Layanan Purnajual Pelanggan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-text-primary tracking-tight font-headline-xl">
                Pengajuan Komplain &amp; Klaim Garansi Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-text-secondary mt-1.5 leading-relaxed max-w-2xl">
                Mengalami masalah cetak pada merchandise, cacat mika akrilik, atau keterlambatan kurir? Sampaikan laporan Anda di bawah ini agar tim QC kami dapat segera memproses penggantian atau cetak ulang same-day.
              </p>
            </div>

            {/* Error Notification */}
            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-status-danger-surface border border-status-danger-border text-status-danger-text text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-8">
              {/* SECTION 1: Identifikasi Pesanan */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Identifikasi Pesanan Anda
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-slate-surface border border-slate-border">
                  <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                    Kode Pesanan / Nomor WhatsApp Pemesan
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookupOrder();
                          }
                        }}
                        placeholder="Contoh: #LUN-ORD-001 atau 081298448821"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-card border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLookupOrder}
                      disabled={isLookingUp}
                      className="px-4 py-2.5 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLookingUp ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Mencari...</span>
                        </>
                      ) : (
                        <>
                          <span>Cek Pesanan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback lookup message */}
                  {lookupMessage && (
                    <p
                      className={`text-[11px] mt-2 font-medium flex items-center gap-1.5 ${
                        lookupMessage.type === 'success'
                          ? 'text-status-success-text'
                          : 'text-status-danger-text'
                      }`}
                    >
                      {lookupMessage.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-status-success-base" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-status-danger-base" />
                      )}
                      <span>{lookupMessage.text}</span>
                    </p>
                  )}

                  {/* Verified Order Summary Card */}
                  {verifiedOrder && (
                    <div className="mt-4 p-3.5 rounded-lg bg-surface-container-low border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                          <PackageCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {verifiedOrder.orderCode}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-semibold">
                              {verifiedOrder.batchName}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-text-primary mt-0.5">
                            {verifiedOrder.productName} — {verifiedOrder.variantName} ({verifiedOrder.quantity} pcs)
                          </p>
                          <p className="text-[11px] text-slate-text-secondary">
                            Pemesan: {verifiedOrder.customerName} ({verifiedOrder.maskedPhone})
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-card text-slate-text-secondary font-bold border border-slate-border self-start sm:self-center">
                        Tahap: {verifiedOrder.pipelineStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Kategori Keluhan & Solusi */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Pilih Kategori Masalah
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Category A */}
                  <div
                    onClick={() => setCategory('CATEGORY_A')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      category === 'CATEGORY_A'
                        ? 'bg-status-danger-surface border-status-danger-base ring-2 ring-status-danger-base/20'
                        : 'bg-slate-surface border-slate-border hover:bg-surface-container-low'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger-surface text-status-danger-text border border-status-danger-border mb-2">
                        Kategori A (Prioritas)
                      </span>
                      <h4 className="text-xs font-bold text-slate-text-primary">
                        Cacat Fisik / Salah Cetak
                      </h4>
                      <p className="text-[11px] text-slate-text-secondary mt-1 leading-snug">
                        Mika akrilik patah/tergores, print buram, salah varian, atau resin tidak rata.
                      </p>
                    </div>
                    <span className="text-[10px] text-status-danger-text font-bold mt-3">
                      ⚡ Prioritas Zero Hassle Reprint
                    </span>
                  </div>

                  {/* Category B */}
                  <div
                    onClick={() => setCategory('CATEGORY_B')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      category === 'CATEGORY_B'
                        ? 'bg-status-warning-surface border-status-warning-base ring-2 ring-status-warning-base/20'
                        : 'bg-slate-surface border-slate-border hover:bg-surface-container-low'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning-surface text-status-warning-text border border-status-warning-border mb-2">
                        Kategori B
                      </span>
                      <h4 className="text-xs font-bold text-slate-text-primary">
                        Kendala Ekspedisi &amp; Kurir
                      </h4>
                      <p className="text-[11px] text-slate-text-secondary mt-1 leading-snug">
                        Paket tertahan di hub kurir, resi tidak bergerak &gt; 3 hari, atau paket hilang.
                      </p>
                    </div>
                    <span className="text-[10px] text-status-warning-text font-bold mt-3">
                      🚚 Investigasi Logistik
                    </span>
                  </div>

                  {/* Category C */}
                  <div
                    onClick={() => setCategory('CATEGORY_C')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      category === 'CATEGORY_C'
                        ? 'bg-surface-container border-primary ring-2 ring-primary/20'
                        : 'bg-slate-surface border-slate-border hover:bg-surface-container-low'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-primary border border-primary/20 mb-2">
                        Kategori C
                      </span>
                      <h4 className="text-xs font-bold text-slate-text-primary">
                        Pertanyaan / Request
                      </h4>
                      <p className="text-[11px] text-slate-text-secondary mt-1 leading-snug">
                        Pertanyaan panduan perawatan merchandise, konfirmasi invoice, atau hal lainnya.
                      </p>
                    </div>
                    <span className="text-[10px] text-primary font-bold mt-3">
                      💬 Konsultasi CS
                    </span>
                  </div>
                </div>

                {/* Deskripsi Masalah */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Jelaskan Kendala Secara Detail <span className="text-status-danger-base">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={issueDetail}
                      onChange={(e) => setIssueDetail(e.target.value)}
                      required
                      placeholder="Contoh: Photocard holder yang saya terima mengalami baret cukup dalam pada mika depan, dan rantai ballchain belum terpasang di kemasan..."
                      className="w-full p-3 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Tautan Foto Bukti Cacat / Video Unboxing (Opsional)
                    </label>
                    <input
                      type="url"
                      value={photoProofUrl}
                      onChange={(e) => setPhotoProofUrl(e.target.value)}
                      placeholder="Contoh: https://drive.google.com/file/... atau tautan Imgur/iCloud"
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                    <p className="text-[11px] text-slate-text-muted mt-1">
                      Melampirkan foto/video unboxing mempercepat proses persetujuan cetak ulang same-day.
                    </p>
                  </div>

                  {/* Solusi yang diinginkan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Solusi yang Diharapkan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Cetak Ulang Same-Day (Zero Hassle Reprint)',
                        'Kirim Ulang Komponen / Freebies yang Kurang',
                        'Pengembalian Dana (Refund)',
                        'Eskalasi Resi & Investigasi Ekspedisi',
                      ].map((item) => (
                        <label
                          key={item}
                          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-all ${
                            expectedResolution === item
                              ? 'bg-surface-container-low border-primary-container text-primary font-bold'
                              : 'bg-slate-surface border-slate-border text-slate-text-secondary hover:bg-surface-container-low'
                          }`}
                        >
                          <input
                            type="radio"
                            name="expectedResolution"
                            checked={expectedResolution === item}
                            onChange={() => setExpectedResolution(item)}
                            className="text-primary-container focus:ring-primary-container"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Informasi Pelapor */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Data Kontak untuk Update Penanganan
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Nama Lengkap Pemesan <span className="text-status-danger-base">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="Masukkan nama Anda..."
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Nomor WhatsApp Aktif <span className="text-status-danger-base">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Contoh: 081298448821"
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-text-muted mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success-base" />
                  <span>
                    Data nomor kontak dilindungi dan disensor sesuai regulasi UU No. 27/2022 (PDP).
                  </span>
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Respon rata-rata: Kurang dari 30 menit kerja</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menerbitkan Tiket Keluhan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Formulir Keluhan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 py-6 border-t border-slate-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-text-muted">
        <p>© 2026 Lunarchivve Studio. Seluruh hak cipta dilindungi.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Garansi Zero Hassle Reprints</span>
          <span>•</span>
          <span>UU No. 27/2022 PDP</span>
          <span>•</span>
          <span>Standar Mutu ISO Studio</span>
        </div>
      </footer>
    </div>
  );
}

export default function ComplaintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-slate-text-muted text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
            <span>Memuat Portal Layanan Purnajual Pelanggan...</span>
          </div>
        </div>
      }
    >
      <ComplaintPublicPortal />
    </Suspense>
  );
}
