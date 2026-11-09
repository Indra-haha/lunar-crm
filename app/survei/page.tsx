'use client';

import React, { useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Star,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  PackageCheck,
  Send,
  MessageSquare,
  Gift,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  ThumbsUp,
  Heart,
} from 'lucide-react';
import { lookupOrderForSurvey, submitPublicFeedback } from '@/app/actions/feedback';

interface VerifiedSurveyOrder {
  id: string;
  orderCode: string;
  productName: string;
  variantName: string;
  quantity: number;
  batchName: string;
  customerName: string;
  city: string;
}

function SurveyContent() {
  const [orderQuery, setOrderQuery] = useState('');
  const [isLookingUp, startLookup] = useTransition();
  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedSurveyOrder | null>(null);
  const [lookupMessage, setLookupMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form States
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [speedRating, setSpeedRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [allowSocialPin, setAllowSocialPin] = useState(true);

  // Submission States
  const [isSubmitting, startSubmit] = useTransition();
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedVoucher, setSubmittedVoucher] = useState<{
    customerName: string;
    voucherCode: string;
    rating: number;
  } | null>(null);

  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const ratingDescriptions: Record<number, string> = {
    1: 'Kecewa / Kurang Puas',
    2: 'Di Bawah Ekspektasi',
    3: 'Cukup / Standar',
    4: 'Puas & Sesuai Harapan',
    5: 'Sangat Puas & Rekomendasi!',
  };

  const handleLookup = () => {
    if (!orderQuery.trim()) {
      setLookupMessage({ type: 'error', text: 'Masukkan kode pesanan (misal: #LUN-ORD-001) atau nomor WhatsApp.' });
      return;
    }

    setLookupMessage(null);
    startLookup(async () => {
      try {
        const res = await lookupOrderForSurvey(orderQuery);
        if (res.found && res.order) {
          setVerifiedOrder(res.order);
          setLookupMessage({
            type: 'success',
            text: `Pesanan ditemukan: ${res.order.orderCode} (${res.order.productName})`,
          });
        } else {
          setVerifiedOrder(null);
          setLookupMessage({
            type: 'error',
            text: 'Pesanan tidak ditemukan. Anda tetap dapat melanjutkan pengisian ulasan secara umum.',
          });
        }
      } catch (err) {
        console.error(err);
        setLookupMessage({ type: 'error', text: 'Gagal mencari pesanan.' });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!comment.trim()) {
      setErrorMessage('Harap tuliskan ulasan atau masukan singkat Anda.');
      return;
    }

    startSubmit(async () => {
      try {
        const res = await submitPublicFeedback({
          orderCode: verifiedOrder ? verifiedOrder.orderCode : orderQuery.trim() || 'SURVEI-UMUM',
          orderId: verifiedOrder?.id,
          rating,
          comment,
          allowSocialPin,
          aspectRatings: {
            quality: qualityRating,
            speed: speedRating,
            service: serviceRating,
          },
        });

        if (res.success) {
          setSubmittedVoucher({
            customerName: res.customerName,
            voucherCode: res.voucherCode,
            rating: res.rating,
          });
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorMessage((err as Error).message || 'Gagal mengirimkan survei.');
      }
    });
  };

  const handleCopyVoucher = () => {
    if (submittedVoucher?.voucherCode) {
      navigator.clipboard.writeText(submittedVoucher.voucherCode);
      setCopiedVoucher(true);
      setTimeout(() => setCopiedVoucher(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-text-primary flex flex-col justify-between">
      {/* Top Header */}
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
                Survei Kepuasan Pelanggan (CSAT)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Audit Purnajual ISO</span>
            </span>
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
      <main className="max-w-3xl w-full mx-auto px-6 py-8 flex-1">
        {submittedVoucher ? (
          /* Thank You & Voucher Screen */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-8 sm:p-10 animate-in fade-in zoom-in-95 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-5">
              <Heart className="w-9 h-9 fill-amber-500" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-2">
              Ulasan Anda Sangat Berharga
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-text-primary tracking-tight font-headline-lg">
              Terima Kasih, {submittedVoucher.customerName}!
            </h2>

            <p className="text-xs text-slate-text-secondary mt-2 max-w-lg mx-auto leading-relaxed">
              Ulasan dan skor rating kepuasan yang Anda berikan telah tersimpan langsung ke dalam metrik <strong>CSAT Dashboard</strong> studio kami untuk menjaga standar purnajual berkualitas tinggi.
            </p>

            {/* Voucher Reward Card */}
            <div className="max-w-md mx-auto mt-6 p-6 rounded-2xl bg-gradient-to-br from-surface-container-low to-slate-surface border border-primary/20 text-left relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-border">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-slate-text-primary">
                    Voucher Diskon Pre-Order Berikutnya
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary text-white font-bold">
                  Diskon 15%
                </span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <span className="text-[11px] text-slate-text-muted block">Kode Kupon Anda:</span>
                  <span className="text-lg font-mono font-bold text-primary tracking-wider">
                    {submittedVoucher.voucherCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyVoucher}
                  className="px-3.5 py-1.5 bg-slate-card border border-slate-border hover:bg-surface-container-low rounded-lg text-xs font-bold text-slate-text-primary flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {copiedVoucher ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-status-success-base" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-text-muted" />
                      <span>Salin Kupon</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-text-muted mt-3">
                *Klaim kode kupon ini saat melakukan pre-order berikutnya di Lunarchivve.
              </p>
            </div>

            <div className="max-w-md mx-auto mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/6281298448821"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-channel-whatsapp-base hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat Admin Lunarchivve</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmittedVoucher(null);
                  setComment('');
                  setVerifiedOrder(null);
                }}
                className="py-3 px-4 bg-slate-surface hover:bg-surface-container-low border border-slate-border text-slate-text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-text-muted" />
                <span>Kirim Ulasan Lainnya</span>
              </button>
            </div>
          </div>
        ) : (
          /* Survey Form */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-6 sm:p-10">
            <div className="border-b border-slate-border pb-6 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Ulasan &amp; Evaluasi Purnajual Merchandise</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-text-primary tracking-tight font-headline-xl">
                Survei Kepuasan Pembeli Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-text-secondary mt-1.5 leading-relaxed max-w-2xl">
                Bagikan pengalaman Anda setelah menerima hasil cetak merchandise kustom dari Lunarchivve. Masukan Anda membantu kami mempertahankan mutu resin, akrilik, dan kecepatan pelayanan.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-status-danger-surface border border-status-danger-border text-status-danger-text text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SECTION 1: Cek Pesanan */}
              <div>
                <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                  Kode Pesanan Anda (Opsional tapi Dianjurkan)
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
                          handleLookup();
                        }
                      }}
                      placeholder="Contoh: #LUN-ORD-001 atau nomor WhatsApp"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookup}
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

                {verifiedOrder && (
                  <div className="mt-4 p-3.5 rounded-lg bg-surface-container-low border border-primary/20 flex items-center gap-3 animate-in fade-in">
                    <PackageCheck className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">
                        {verifiedOrder.orderCode}
                      </span>
                      <p className="text-xs font-bold text-slate-text-primary">
                        {verifiedOrder.productName} ({verifiedOrder.variantName})
                      </p>
                      <p className="text-[11px] text-slate-text-secondary">
                        Pemesan: {verifiedOrder.customerName} • {verifiedOrder.batchName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Star Rating Utuh */}
              <div className="p-6 rounded-2xl bg-slate-surface border border-slate-border text-center">
                <span className="text-xs font-bold text-slate-text-muted uppercase tracking-wider block mb-2">
                  Seberapa Puas Anda dengan Pesanan Ini?
                </span>

                <div className="flex items-center justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="text-sm font-bold text-slate-text-primary">
                  {ratingDescriptions[hoverRating || rating]}
                </div>
              </div>

              {/* SECTION 3: Penilaian Aspek Spesifik */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-text-primary uppercase tracking-wider">
                  Penilaian Rinci Tiap Aspek
                </h4>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-surface border border-slate-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-text-primary block">
                        Kualitas Bahan &amp; Hasil Cetak
                      </span>
                      <span className="text-[11px] text-slate-text-muted">
                        Ketebalan akrilik, kejernihan resin, kepekatan warna print.
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          onClick={() => setQualityRating(s)}
                          className={`w-5 h-5 cursor-pointer ${
                            qualityRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-surface border border-slate-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-text-primary block">
                        Kecepatan Produksi &amp; Ekspedisi
                      </span>
                      <span className="text-[11px] text-slate-text-muted">
                        Kesesuaian jadwal batch PO dan ketepatan resi kurir.
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          onClick={() => setSpeedRating(s)}
                          className={`w-5 h-5 cursor-pointer ${
                            speedRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-surface border border-slate-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-text-primary block">
                        Keramahan &amp; Respon Admin CS
                      </span>
                      <span className="text-[11px] text-slate-text-muted">
                        Kecepatan respon First Response Time &lt; 15 menit.
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          onClick={() => setServiceRating(s)}
                          className={`w-5 h-5 cursor-pointer ${
                            serviceRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Testimoni & Izin Promosi */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                    Tulis Ulasan &amp; Masukan Anda <span className="text-status-danger-base">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Contoh: Photocard holder B8 kustomnya rapi banget pengerjaannya! Tidak ada sisa lem bleberan atau baret di mika akriliknya. Dapet freebies sticker lucu juga..."
                    className="w-full p-3 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                  />
                </div>

                <label className="p-3.5 rounded-xl bg-slate-surface border border-slate-border flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowSocialPin}
                    onChange={(e) => setAllowSocialPin(e.target.checked)}
                    className="mt-0.5 rounded border-slate-border text-primary-container focus:ring-primary-container"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-text-primary block">
                      Izinkan Tampilkan Ulasan di Media Sosial Lunarchivve
                    </span>
                    <span className="text-[11px] text-slate-text-secondary leading-snug">
                      Testimoni terbaik Anda dapat disematkan (pinned) pada konten promosi Instagram &amp; TikTok studio kami.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-border flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-3 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirimkan Ulasan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Ulasan &amp; Ambil Kupon Diskon</span>
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
        <p>© 2026 Lunarchivve Studio. Hak cipta dilindungi undang-undang.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Ulasan Terverifikasi Pembeli</span>
          <span>•</span>
          <span>UU No. 27/2022 PDP</span>
          <span>•</span>
          <span>Voucher Diskon PO</span>
        </div>
      </footer>
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-slate-text-muted text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
            <span>Memuat Formulir Survei Purnajual...</span>
          </div>
        </div>
      }
    >
      <SurveyContent />
    </Suspense>
  );
}
