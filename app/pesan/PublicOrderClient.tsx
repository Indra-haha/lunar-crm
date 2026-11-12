'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  FileText,
  CreditCard,
  UploadCloud,
} from 'lucide-react';
import Image from 'next/image';
import { ProductItem } from '@/app/actions/products';
import { submitPublicOrder } from '@/app/actions/orders';
import { formatRupiah } from '@/lib/formatters';

interface PublicOrderClientProps {
  products: ProductItem[];
}

export default function PublicOrderClient({ products }: PublicOrderClientProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [selectedVariantName, setSelectedVariantName] = useState<string>(
    selectedProduct?.variants[0]?.name || 'Standar'
  );

  const selectedVariant =
    selectedProduct?.variants.find((v) => v.name === selectedVariantName) ||
    selectedProduct?.variants[0];

  const [quantity, setQuantity] = useState<number>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [city, setCity] = useState('');
  const [briefNotes, setBriefNotes] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<'DP_50' | 'LUNAS_100'>('DP_50');

  // Submission States
  const [isSubmitting, startSubmit] = useTransition();
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderCode: string;
    productName: string;
    variantName: string;
    quantity: number;
    totalPrice: number;
    paymentStatus: string;
    customerName: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Price Calculation
  const unitPrice = (selectedProduct?.basePrice || 0) + (selectedVariant?.additionalPrice || 0);
  const totalPrice = unitPrice * (quantity > 0 ? quantity : 1);
  const dpAmount = Math.round(totalPrice * 0.5);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.variants && prod.variants.length > 0) {
      setSelectedVariantName(prod.variants[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('Nama lengkap dan nomor WhatsApp aktif wajib diisi.');
      return;
    }

    if (!selectedProduct) {
      setErrorMessage('Pilih salah satu produk merchandise.');
      return;
    }

    startSubmit(async () => {
      try {
        const result = await submitPublicOrder({
          fullName,
          phone,
          socialHandle,
          city,
          productName: selectedProduct.name,
          variantName: selectedVariant?.name || 'Standar',
          quantity,
          totalPrice,
          briefNotes,
          designUrl,
          paymentPlan,
          batchName: selectedProduct.batchAvailable,
        });

        if (result.success) {
          setSubmittedOrder(result);
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorMessage((err as Error).message || 'Terjadi kesalahan saat memproses pesanan.');
      }
    });
  };

  const handleCopyCode = () => {
    if (submittedOrder?.orderCode) {
      navigator.clipboard.writeText(submittedOrder.orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setSubmittedOrder(null);
    setQuantity(1);
    setBriefNotes('');
    setDesignUrl('');
  };

  return (
    <div className="min-h-screen bg-background text-slate-text-primary flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full bg-slate-card border-b border-slate-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
                Studio Pre-Order &amp; Custom Merch
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-status-success-surface border border-status-success-border text-status-success-text text-xs font-bold">
              {selectedProduct?.batchAvailable || 'Batch #12 Open'}
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

      {/* Main Form Area */}
      <main className="max-w-4xl w-full mx-auto px-6 py-8 flex-1">
        {submittedOrder ? (
          /* Confirmation Receipt */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-8 sm:p-10 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-status-success-surface border border-status-success-border text-status-success-base flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-2">
                Pesanan Pre-Order Berhasil Dicatat
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-text-primary tracking-tight font-headline-lg">
                Terima Kasih, {submittedOrder.customerName}!
              </h2>
              <p className="text-xs text-slate-text-secondary mt-2 leading-relaxed">
                Pesanan kustom merchandise Anda telah masuk ke dalam antrean studio tahap <strong>Order Masuk</strong>. Tim desainer kami akan memverifikasi kesesuaian brief dan mengirimkan draft approval.
              </p>
            </div>

            {/* Official Order Receipt */}
            <div className="max-w-lg mx-auto bg-slate-surface rounded-xl border border-slate-border p-6 mb-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-border">
                <div>
                  <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                    Kode Pesanan Resmi
                  </span>
                  <div className="text-xl font-mono font-bold text-primary mt-0.5">
                    {submittedOrder.orderCode}
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
                  <span className="text-slate-text-muted text-[11px]">Merchandise:</span>
                  <p className="font-semibold text-slate-text-primary mt-0.5">
                    {submittedOrder.productName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Pilihan Varian:</span>
                  <p className="font-semibold text-slate-text-primary mt-0.5">
                    {submittedOrder.variantName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Jumlah Item:</span>
                  <p className="font-semibold text-slate-text-primary mt-0.5">
                    {submittedOrder.quantity} pcs
                  </p>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[11px]">Total Tagihan:</span>
                  <p className="font-bold text-primary text-sm mt-0.5">
                    {formatRupiah(submittedOrder.totalPrice)}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-text-muted">Status Pembayaran:</span>
                <span className="px-2.5 py-0.5 rounded font-bold text-[10px] bg-status-success-surface text-status-success-text border border-status-success-border">
                  {submittedOrder.paymentStatus}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/6281298448821?text=${encodeURIComponent(
                  `Halo Admin Lunarchivve! Saya baru saja melakukan pre-order dengan Kode Pesanan: ${submittedOrder.orderCode} (${submittedOrder.productName} - ${submittedOrder.variantName}, Qty: ${submittedOrder.quantity} pcs). Mohon konfirmasi rekening/pembayarannya ya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-channel-whatsapp-base hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Konfirmasi ke WhatsApp Admin</span>
              </a>
              <button
                type="button"
                onClick={resetForm}
                className="py-3 px-4 bg-slate-surface hover:bg-surface-container-low border border-slate-border text-slate-text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-text-muted" />
                <span>Pesan Item Lainnya</span>
              </button>
            </div>
          </div>
        ) : (
          /* Pre-Order Form */
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-sm p-6 sm:p-10">
            {/* Header Banner */}
            <div className="border-b border-slate-border pb-6 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <Package className="w-3.5 h-3.5" />
                <span>Formulir Pemesanan Merchandise Resmi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-text-primary tracking-tight font-headline-xl">
                Pre-Order Custom Merchandise Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-text-secondary mt-1.5 leading-relaxed max-w-2xl">
                Lengkapi formulir di bawah ini untuk memesan akrilik standee, photocard holder, artprint foil, atau apparel kustom. Data pesanan Anda terintegrasi langsung ke sistem pipeline studio kami.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-status-danger-surface border border-status-danger-border text-status-danger-text text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form action="/pesan" method="post" onSubmit={handleSubmit} className="space-y-8">
              {/* SECTION 1: Data Identitas Pemesan */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Identitas &amp; Alamat Pengiriman
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Nama Lengkap Pemesan <span className="text-status-danger-base">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda..."
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Nomor WhatsApp Aktif <span className="text-status-danger-base">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081298448821"
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Username Medsos (Instagram / TikTok / Twitter)
                    </label>
                    <input
                      type="text"
                      value={socialHandle}
                      onChange={(e) => setSocialHandle(e.target.value)}
                      placeholder="Contoh: @adindakirana"
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Kota / Kabupaten Pengiriman
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Jakarta Selatan, Surabaya, dll."
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-text-muted mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success-base" />
                  <span>
                    Data nomor kontak dilindungi dan disensor otomatis sesuai regulasi UU No. 27/2022 (PDP).
                  </span>
                </p>
              </div>

              {/* SECTION 2: Pilihan Merchandise dari Master Produk */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Pilihan Merchandise &amp; Varian Spesifikasi
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Pilih Produk Merchandise (Katalog Master)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary font-bold focus:outline-none focus:border-primary-container"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatRupiah(p.basePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Pilihan Varian / Finishing
                    </label>
                    <select
                      value={selectedVariantName}
                      onChange={(e) => setSelectedVariantName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary font-bold focus:outline-none focus:border-primary-container"
                    >
                      {selectedProduct?.variants?.map((v, i) => (
                        <option key={i} value={v.name}>
                          {v.name} {v.additionalPrice > 0 ? `(+${formatRupiah(v.additionalPrice)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Product Preview Card */}
                {selectedProduct && (
                  <div className="p-4 rounded-xl bg-slate-surface border border-slate-border flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 relative shrink-0">
                      <Image
                        src={
                          selectedProduct.imageUrl ||
                          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80'
                        }
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {selectedProduct.productCode}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-semibold">
                          {selectedProduct.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-text-primary mt-0.5">
                        {selectedProduct.name} ({selectedVariantName})
                      </h4>
                      <p className="text-[11px] text-slate-text-secondary mt-0.5">
                        Harga Satuan: <strong className="text-slate-text-primary">{formatRupiah(unitPrice)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs font-semibold text-slate-text-primary">Jumlah:</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2.5 py-1.5 bg-slate-card border border-slate-border rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
                      />
                      <span className="text-xs text-slate-text-muted">pcs</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: Brief Desain & File Upload */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Brief Desain &amp; Tautan Aset
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Catatan Brief Teknis Desain
                    </label>
                    <textarea
                      rows={3}
                      value={briefNotes}
                      onChange={(e) => setBriefNotes(e.target.value)}
                      placeholder="Contoh: Cetak akrilik 2 sisi, sisi depan karakter A, sisi belakang background galaxy doff..."
                      className="w-full p-3 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-text-primary mb-1.5">
                      Tautan File Desain (Google Drive / OneDrive / Dropbox / Canva)
                    </label>
                    <div className="relative flex items-center">
                      <UploadCloud className="w-4 h-4 text-slate-text-muted absolute left-3.5 pointer-events-none" />
                      <input
                        type="url"
                        value={designUrl}
                        onChange={(e) => setDesignUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-text-muted mt-1">
                      Pastikan tautan Google Drive / Cloud Anda dapat diakses (Anyone with the link can view).
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Ringkasan Tagihan & Skema Pembayaran */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Ringkasan Tagihan &amp; Skema Pembayaran PO
                  </h3>
                </div>

                <div className="p-5 rounded-xl bg-slate-surface border border-slate-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label
                      className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                        paymentPlan === 'DP_50'
                          ? 'bg-surface-container-low border-primary-container text-primary font-bold'
                          : 'bg-slate-card border-slate-border text-slate-text-secondary hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentPlan"
                        checked={paymentPlan === 'DP_50'}
                        onChange={() => setPaymentPlan('DP_50')}
                        className="text-primary-container focus:ring-primary-container"
                      />
                      <div>
                        <span className="block text-slate-text-primary font-bold">Down Payment (DP 50%)</span>
                        <span className="text-[11px] text-slate-text-muted">
                          Bayar {formatRupiah(dpAmount)} sekarang, pelunasan saat lolos QC.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                        paymentPlan === 'LUNAS_100'
                          ? 'bg-surface-container-low border-primary-container text-primary font-bold'
                          : 'bg-slate-card border-slate-border text-slate-text-secondary hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentPlan"
                        checked={paymentPlan === 'LUNAS_100'}
                        onChange={() => setPaymentPlan('LUNAS_100')}
                        className="text-primary-container focus:ring-primary-container"
                      />
                      <div>
                        <span className="block text-slate-text-primary font-bold">Lunas 100% di Awal</span>
                        <span className="text-[11px] text-slate-text-muted">
                          Pembayaran penuh {formatRupiah(totalPrice)} (Freebies stiker eksklusif).
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-border">
                    <span className="text-xs text-slate-text-secondary">Estimasi Total Biaya PO:</span>
                    <span className="text-xl font-bold text-slate-text-primary font-headline-lg">
                      {formatRupiah(totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Verifikasi brief cepat &lt; 15 menit melalui WhatsApp</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-3 bg-primary-container hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mencatat Pesanan Pre-Order...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Pesanan Pre-Order</span>
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
