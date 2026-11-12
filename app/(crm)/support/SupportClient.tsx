'use client';

import React, { useState, useTransition } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  ZoomIn,
  Send,
  PlusCircle,
  Search,
  Check,
  UserCheck,
  X,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Phone,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PopulatedTicketItem,
  submitQAChecklist,
  createTicket,
  updateTicketStatus,
} from '@/app/actions/support';
import { updateOrderStatus } from '@/app/actions/orders';
import { TicketCategory, TicketStatus } from '@/models/SupportTicket';

interface SupportClientProps {
  initialTickets: PopulatedTicketItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qaOrders: any[];
}

export default function SupportClient({ initialTickets, qaOrders }: SupportClientProps) {
  const [tickets, setTickets] = useState<PopulatedTicketItem[]>(initialTickets);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTicketQuery, setSearchTicketQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Selected Order for QA Inspection Workbench
  const [selectedQAOrderId, setSelectedQAOrderId] = useState<string>(
    qaOrders[0]?.id || ''
  );

  const currentQAOrder = qaOrders.find((o) => o.id === selectedQAOrderId) || qaOrders[0];

  // QA Checkboxes State
  const [qaChecks, setQaChecks] = useState({
    specMatched: currentQAOrder?.qaChecklist?.specMatched ?? true,
    quantityMatched: currentQAOrder?.qaChecklist?.quantityMatched ?? true,
    noDefects: currentQAOrder?.qaChecklist?.noDefects ?? true,
    peelOffFilmChecked: currentQAOrder?.qaChecklist?.peelOffFilmChecked ?? true,
    notes: currentQAOrder?.qaChecklist?.notes || 'Sedikit residu debu statis maklon - telah dibersihkan steril.',
    inspectorName: currentQAOrder?.qaChecklist?.inspectorName || 'Said Najih',
  });

  const [qaSuccessMessage, setQaSuccessMessage] = useState<string | null>(null);
  const [copiedComplaintLink, setCopiedComplaintLink] = useState(false);

  // New Ticket Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    orderId: qaOrders[0]?.id || '',
    category: 'CATEGORY_A' as TicketCategory,
    issueDetail: '',
    assignedPIC: 'Said Najih',
  });

  // Photo Zoom Modal State
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // When selected order changes, sync checkboxes
  const handleSelectQAOrder = (orderId: string) => {
    setSelectedQAOrderId(orderId);
    const order = qaOrders.find((o) => o.id === orderId);
    if (order?.qaChecklist) {
      setQaChecks({
        specMatched: order.qaChecklist.specMatched,
        quantityMatched: order.qaChecklist.quantityMatched,
        noDefects: order.qaChecklist.noDefects,
        peelOffFilmChecked: order.qaChecklist.peelOffFilmChecked ?? true,
        notes: order.qaChecklist.notes || '',
        inspectorName: order.qaChecklist.inspectorName || 'Said Najih',
      });
    } else {
      setQaChecks({
        specMatched: true,
        quantityMatched: true,
        noDefects: true,
        peelOffFilmChecked: true,
        notes: 'Inspeksi QC baru disiapkan.',
        inspectorName: 'Said Najih',
      });
    }
    setQaSuccessMessage(null);
  };

  // Submit QA Approval & Trigger Real WhatsApp Click-to-Chat
  const handleApproveQC = async () => {
    if (!currentQAOrder) return;

    startTransition(async () => {
      try {
        const res = await submitQAChecklist(
          currentQAOrder.id,
          {
            specMatched: qaChecks.specMatched,
            quantityMatched: qaChecks.quantityMatched,
            noDefects: qaChecks.noDefects,
            peelOffFilmChecked: qaChecks.peelOffFilmChecked,
            notes: qaChecks.notes,
          },
          qaChecks.inspectorName
        );

        if (res.isApproved) {
          setQaSuccessMessage(
            `QC Approved! Pesanan ${currentQAOrder.orderCode} berhasil lolos uji fisik 100% dan status otomatis dipindahkan ke SIAP KIRIM.`
          );

          // Trigger real WhatsApp URL with pre-filled confirmation
          const phone = currentQAOrder.customerPhone
            ? currentQAOrder.customerPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')
            : '6281298448821';
          const waMsg = `Halo kak ${currentQAOrder.customerName}! ✨ Kabar gembira dari Lunarchivve Merch & Studio: Pesanan merchandise kustom ${currentQAOrder.orderCode} (${currentQAOrder.productName}) telah selesai diperiksa oleh QC (${qaChecks.inspectorName}) dan LOLOS UJI KUALITAS 100% BEBAS CACAT. Paket saat ini sedang dipacking aman dan siap diserahkan ke kurir ekspedisi sore ini! 📦✨`;
          const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;

          // Open WhatsApp web in new tab
          window.open(waUrl, '_blank');
        } else {
          setQaSuccessMessage(`QC Checklist disimpan dengan catatan revisi.`);
        }
      } catch (err) {
        alert('Gagal submit QC: ' + err);
      }
    });
  };

  // Tolak QC (Rework)
  const handleRejectQC = async () => {
    if (!currentQAOrder) return;
    if (!confirm(`Tolak QC untuk pesanan ${currentQAOrder.orderCode} dan kembalikan ke tahap Vendor untuk perbaikan?`)) return;

    startTransition(async () => {
      try {
        await updateOrderStatus(currentQAOrder.id, 'PRODUKSI_VENDOR');
        setQaSuccessMessage(
          `Pesanan ${currentQAOrder.orderCode} telah dikembalikan ke status PRODUKSI VENDOR untuk proses perbaikan (Rework).`
        );
      } catch (err) {
        alert('Gagal reject QC: ' + err);
      }
    });
  };

  // Handle Ticket Status Change
  const handleStatusChange = async (ticketId: string, nextStatus: TicketStatus) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: nextStatus,
              resolvedAt: nextStatus === 'RESOLVED' ? new Date().toISOString() : t.resolvedAt,
              durationCRT: nextStatus === 'RESOLVED' ? 'Baru saja diselesaikan' : t.durationCRT,
            }
          : t
      )
    );

    startTransition(async () => {
      try {
        await updateTicketStatus(ticketId, nextStatus);
      } catch (err) {
        alert('Gagal update status tiket: ' + err);
      }
    });
  };

  // Handle Create Ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.orderId || !ticketForm.issueDetail) return;

    startTransition(async () => {
      try {
        const newTk = await createTicket(ticketForm);
        const refOrder = qaOrders.find((o) => o.id === ticketForm.orderId);

        const item: PopulatedTicketItem = {
          id: newTk._id,
          ticketCode: newTk.ticketCode,
          orderId: ticketForm.orderId,
          orderCode: refOrder?.orderCode || '#LUN-ORD-NEW',
          customerId: '',
          customerName: refOrder?.customerName || 'Pelanggan',
          customerPhone: refOrder?.customerPhone || '',
          maskedPhone: refOrder?.maskedPhone || '0812-****-8821',
          category: newTk.category,
          categoryLabel:
            newTk.category === 'CATEGORY_A'
              ? 'Kategori A: Cacat Fisik / Salah Cetak'
              : newTk.category === 'CATEGORY_B'
              ? 'Kategori B: Keterlambatan Ekspedisi'
              : 'Kategori C: Pertanyaan Teknis / Status',
          issueDetail: newTk.issueDetail,
          assignedPIC: newTk.assignedPIC,
          status: 'OPEN',
          resolvedAt: null,
          durationCRT: 'Dalam antrean',
          createdAt: new Date().toISOString(),
        };

        setTickets((prev) => [item, ...prev]);
        setIsNewTicketOpen(false);
        setTicketForm({
          orderId: qaOrders[0]?.id || '',
          category: 'CATEGORY_A',
          issueDetail: '',
          assignedPIC: 'Said Najih',
        });
      } catch (err) {
        alert('Gagal membuat tiket: ' + err);
      }
    });
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
    if (searchTicketQuery.trim()) {
      const q = searchTicketQuery.toLowerCase();
      const matchCode = t.ticketCode.toLowerCase().includes(q);
      const matchOrder = t.orderCode.toLowerCase().includes(q);
      const matchCust = t.customerName.toLowerCase().includes(q);
      const matchIssue = t.issueDetail.toLowerCase().includes(q);
      const matchPIC = t.assignedPIC.toLowerCase().includes(q);
      if (!matchCode && !matchOrder && !matchCust && !matchIssue && !matchPIC) return false;
    }
    return true;
  });

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
              Tiket Keluhan &amp; Kontrol Kualitas QA
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-status-danger-surface text-status-danger-text text-[10px] uppercase tracking-wider font-bold">
              TOWS: W1 + T2 &amp; W2 + T3
            </span>
          </div>

          <div className="flex items-center gap-2 text-status-success-text text-xs bg-status-success-surface px-3 py-1 rounded-full border border-status-success-border font-semibold">
            <ShieldCheck className="w-4 h-4 text-status-success-base" />
            <span>Zero-Defect Guarantee • Pre-Packing Inspection</span>
          </div>
        </div>

        {/* Title */}
        <div className="max-w-3xl">
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
            Quality Assurance (QA) &amp; Customer Support Ticketing
          </h1>
          <p className="text-slate-text-secondary text-sm mt-1">
            Workbench validasi batch produksi fisik merchandise kustom sebelum packing kemasan, serta sistem ticketing keluhan pelanggan dengan SLA penanganan cepat.
          </p>
        </div>
      </section>

      {/* 2. SECTION A: Panel Cek Kualitas & Packing Checklist (QA Workbench) */}
      <section className="px-8 py-4">
        <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-6 flex flex-col gap-5">
          {/* Section A Header & Order Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-border">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-text-primary">
                  Verifikasi Akhir Sebelum Packing (Digital QC Checklist)
                </h2>
              </div>
              <p className="text-xs text-slate-text-secondary mt-0.5">
                Workbench validasi batch produksi fisik merchandise kustom dan pengiriman foto konfirmasi kemasan.
              </p>
            </div>

            {/* Order Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-text-muted">Pilih Pesanan QC:</span>
              <select
                value={selectedQAOrderId}
                onChange={(e) => handleSelectQAOrder(e.target.value)}
                className="bg-slate-surface text-slate-text-primary text-xs py-2 px-3 rounded-lg border border-slate-border font-bold cursor-pointer focus:outline-none"
              >
                {qaOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.orderCode} • {ord.customerName} ({ord.productName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alert Success Banner if approved */}
          {qaSuccessMessage && (
            <div className="p-3 bg-status-success-surface border border-status-success-border rounded-xl text-xs font-bold text-status-success-text flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-status-success-base" />
                <span>{qaSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setQaSuccessMessage(null)}
                className="text-status-success-text hover:opacity-75 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Current Order Spec Summary Banner */}
          {currentQAOrder && (
            <div className="bg-slate-surface rounded-xl p-4 border border-slate-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center font-bold text-xs text-primary shrink-0 border border-slate-border">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-text-primary">
                      {currentQAOrder.productName}
                    </span>
                    <span className="px-2 py-0.5 bg-surface-container text-primary text-[11px] font-semibold rounded">
                      {currentQAOrder.variantName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-slate-text-secondary text-xs flex-wrap">
                    <span>
                      Qty: <strong className="text-slate-text-primary font-bold">{currentQAOrder.quantity} pcs</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Pemesan: <strong className="text-slate-text-primary font-bold">{currentQAOrder.customerName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Brief: <strong className="text-slate-text-primary">{currentQAOrder.briefNotes || 'Packaging rapi steril'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right mr-1">
                  <p className="text-[10px] text-slate-text-muted">Target Ekspedisi</p>
                  <p className="text-xs font-bold text-slate-text-primary">Hari ini, 17:00 WIB</p>
                </div>
                <span className="px-3 py-1 bg-status-success-surface text-status-success-text text-xs font-bold rounded-lg border border-status-success-border">
                  Siap Masuk Packing
                </span>
              </div>
            </div>
          )}

          {/* 2-Columns: Checklists (Left) & Photo Proof Inspection Mat (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            {/* 4 Digital Checkpoints (Left 7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-text-primary uppercase tracking-wide">
                  Daftar Uji Kualitas Fisik (4 Poin Verifikasi)
                </span>
                <span className="text-[11px] text-status-success-text font-bold bg-status-success-surface px-2 py-0.5 rounded border border-status-success-border">
                  {[qaChecks.specMatched, qaChecks.quantityMatched, qaChecks.noDefects, qaChecks.peelOffFilmChecked].filter(Boolean).length}/4 Terverifikasi
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Point 1 */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-surface hover:bg-surface-container-low border border-slate-border transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qaChecks.specMatched}
                    onChange={(e) => setQaChecks({ ...qaChecks, specMatched: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-primary-container focus:ring-primary cursor-pointer"
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-text-primary">
                        1. Kesesuaian Desain &amp; Varian Sisi Cetak
                      </span>
                      {qaChecks.specMatched && (
                        <span className="text-[10px] text-status-success-text font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-text-secondary mt-0.5">
                      Varian, dimensi, dan orientasi cetak 2 sisi (sandwich print) cocok dengan mockup proofing final yang disetujui pemesan.
                    </p>
                  </div>
                </label>

                {/* Point 2 */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-surface hover:bg-surface-container-low border border-slate-border transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qaChecks.quantityMatched}
                    onChange={(e) => setQaChecks({ ...qaChecks, quantityMatched: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-primary-container focus:ring-primary cursor-pointer"
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-text-primary">
                        2. Kelengkapan Jumlah &amp; Aksesoris Pendukung
                      </span>
                      {qaChecks.quantityMatched && (
                        <span className="text-[10px] text-status-success-text font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Lengkap
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-text-secondary mt-0.5">
                      Jumlah {currentQAOrder?.quantity || 2} pcs lengkap dengan gantungan rantai/clasp, ring penyambung kuat tanpa renggang, serta kartu backing foil hologram.
                    </p>
                  </div>
                </label>

                {/* Point 3 */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-surface hover:bg-surface-container-low border border-slate-border transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qaChecks.noDefects}
                    onChange={(e) => setQaChecks({ ...qaChecks, noDefects: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-primary-container focus:ring-primary cursor-pointer"
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-text-primary">
                        3. Integritas Fisik &amp; Hasil Cetak UV Epoxy
                      </span>
                      {qaChecks.noDefects && (
                        <span className="text-[10px] text-status-success-text font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Bebas Cacat
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-text-secondary mt-0.5">
                      Bebas goresan mikro, buram, dan gelembung lem epoxy. Lapisan glossy bening sempurna.
                    </p>
                  </div>
                </label>

                {/* Point 4 */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-surface hover:bg-surface-container-low border border-slate-border transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qaChecks.peelOffFilmChecked}
                    onChange={(e) => setQaChecks({ ...qaChecks, peelOffFilmChecked: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-primary-container focus:ring-primary cursor-pointer"
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-text-primary">
                        4. Proteksi Peel-Off Film &amp; Bubble Wrap
                      </span>
                      {qaChecks.peelOffFilmChecked && (
                        <span className="text-[10px] text-status-success-text font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Terpasang
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-text-secondary mt-0.5">
                      Lapisan plastik pelindung akrilik terpasang rapi di kedua sisi sebelum dimasukkan ke kantong OPP seal premium.
                    </p>
                  </div>
                </label>
              </div>

              {/* Inspector & Notes Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-text-primary block mb-1">
                    Nama Pemeriksa (Inspector QC)
                  </label>
                  <input
                    type="text"
                    value={qaChecks.inspectorName}
                    onChange={(e) => setQaChecks({ ...qaChecks, inspectorName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-text-primary block mb-1">
                    Catatan Pemeriksaan
                  </label>
                  <input
                    type="text"
                    value={qaChecks.notes}
                    onChange={(e) => setQaChecks({ ...qaChecks, notes: e.target.value })}
                    placeholder="Catatan kebersihan atau packing..."
                    className="w-full px-3 py-1.5 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Photo Proof & Action Box (Right 5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-text-primary uppercase tracking-wide">
                  Dokumentasi Foto Bukti QC
                </span>
                <span className="text-[11px] text-slate-text-muted">Resolusi Tinggi</span>
              </div>

              {/* Studio Mat Grid Photo Box */}
              <div className="relative bg-slate-surface rounded-xl overflow-hidden border border-slate-border shadow-xs group">
                <div className="relative h-56 w-full bg-slate-800 flex items-center justify-center overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
                    alt="QC Mat Inspection"
                    width={400}
                    height={220}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  {/* Mat overlay badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded font-mono text-[10px] flex items-center gap-1.5 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success-base" />
                    <span>GRID MAT: 6.0 x 4.8 CM • PASS</span>
                  </div>
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="px-2 py-1 bg-white/90 hover:bg-white text-slate-text-primary rounded text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      Zoom 100%
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-card border-t border-slate-border flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-text-muted" /> Foto diambil 14:22 WIB
                    </span>
                    <span className="font-bold text-slate-text-primary">
                      PIC: {qaChecks.inspectorName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-channel-whatsapp-text font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" /> Auto-lampirkan ke WhatsApp
                    </span>
                    <span className="text-slate-text-muted text-[10px]">Kamera Studio Ready</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleApproveQC}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-channel-whatsapp-base hover:bg-channel-whatsapp-text text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isPending ? 'Memproses...' : 'Approve QC & Kirim WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectQC}
                  className="w-full sm:w-auto py-2.5 px-3 bg-status-danger-surface hover:bg-status-danger-border text-status-danger-text text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Tolak QC (Rework)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION B: Log Tiket Keluhan Pelanggan */}
      <section className="px-8 pb-8">
        <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-6 flex flex-col gap-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-border">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-status-danger-base" />
                <h2 className="text-lg font-bold text-slate-text-primary">
                  Log Tiket Komplain &amp; Pelayanan Pelanggan
                </h2>
              </div>
              <p className="text-xs text-slate-text-secondary mt-0.5">
                Monitoring investigasi keluhan cacat fisik, keterlambatan ekspedisi, dan resolusi cepat (CRT).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/komplain"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-bold transition-all border border-primary/20 shrink-0"
                title="Buka formulir pengajuan keluhan publik pelanggan di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Form Keluhan Publik</span>
              </Link>

              <Link
                href="/survei"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all border border-amber-200 shrink-0"
                title="Buka form survei kepuasan pelanggan (CSAT) publik di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Form CSAT (/survei)</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/komplain`;
                  navigator.clipboard.writeText(url);
                  setCopiedComplaintLink(true);
                  setTimeout(() => setCopiedComplaintLink(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-surface hover:bg-surface-container-low text-slate-text-primary rounded-lg text-xs font-bold border border-slate-border transition-all cursor-pointer shrink-0"
                title="Salin tautan formulir keluhan untuk dikirim ke chat pelanggan"
              >
                {copiedComplaintLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-success-base" />
                    <span>Link Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-text-muted" />
                    <span>Salin Link Form</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsNewTicketOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-secondary text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Buat Tiket Manual</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-primary-container text-white shadow-xs'
                    : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Semua Tiket ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('CATEGORY_A')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'CATEGORY_A'
                    ? 'bg-status-danger-base text-white shadow-xs'
                    : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Kategori A: Cacat Fisik ({tickets.filter((t) => t.category === 'CATEGORY_A').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('CATEGORY_B')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'CATEGORY_B'
                    ? 'bg-status-warning-base text-white shadow-xs'
                    : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Kategori B: Ekspedisi ({tickets.filter((t) => t.category === 'CATEGORY_B').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('CATEGORY_C')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'CATEGORY_C'
                    ? 'bg-channel-web-base text-white shadow-xs'
                    : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Kategori C: Teknis ({tickets.filter((t) => t.category === 'CATEGORY_C').length})
              </button>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchTicketQuery}
                onChange={(e) => setSearchTicketQuery(e.target.value)}
                placeholder="Cari no tiket, pesanan, PIC, atau isu..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Tickets Data Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-surface/70 text-slate-text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-slate-border select-none">
                  <th className="py-3 px-4">No. Tiket</th>
                  <th className="py-3 px-3">No. Pesanan</th>
                  <th className="py-3 px-3">Pelanggan &amp; Kontak</th>
                  <th className="py-3 px-3">Kategori &amp; Ringkasan Isu</th>
                  <th className="py-3 px-3">PIC Studio</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Durasi CRT</th>
                  <th className="py-3 px-4 text-right">Ubah Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-text-muted">
                      Tidak ada tiket yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((tk) => (
                    <tr key={tk.id} className="hover:bg-slate-surface/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-text-primary">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              tk.status === 'OPEN'
                                ? 'bg-status-danger-base animate-pulse'
                                : tk.status === 'IN_PROGRESS'
                                ? 'bg-status-warning-base'
                                : 'bg-status-success-base'
                            }`}
                          />
                          <span>{tk.ticketCode}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-primary">
                        {tk.orderCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-text-primary">{tk.customerName}</span>
                          <span className="text-[10px] text-slate-text-muted font-mono">
                            {tk.maskedPhone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center w-max px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tk.category === 'CATEGORY_A'
                                ? 'bg-status-danger-surface text-status-danger-text'
                                : tk.category === 'CATEGORY_B'
                                ? 'bg-status-warning-surface text-status-warning-text'
                                : 'bg-channel-web-surface text-channel-web-text'
                            }`}
                          >
                            {tk.category === 'CATEGORY_A'
                              ? 'Cacat Fisik / Salah Cetak'
                              : tk.category === 'CATEGORY_B'
                              ? 'Keterlambatan Ekspedisi'
                              : 'Pertanyaan Teknis'}
                          </span>
                          <p className="text-slate-text-secondary text-[11px] truncate">
                            {tk.issueDetail}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-text-primary">
                        {tk.assignedPIC}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tk.status === 'OPEN'
                              ? 'bg-status-danger-surface text-status-danger-text'
                              : tk.status === 'IN_PROGRESS'
                              ? 'bg-status-warning-surface text-status-warning-text'
                              : 'bg-status-success-surface text-status-success-text'
                          }`}
                        >
                          {tk.status === 'OPEN'
                            ? 'Open'
                            : tk.status === 'IN_PROGRESS'
                            ? 'In Progress'
                            : 'Resolved'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-text-secondary text-[11px] font-medium">
                        {tk.durationCRT}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={tk.status}
                          onChange={(e) =>
                            handleStatusChange(tk.id, e.target.value as TicketStatus)
                          }
                          className="bg-slate-surface text-slate-text-primary text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-border cursor-pointer focus:outline-none"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved ✅</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Zoom Mat Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-card rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-border"
          >
            <div className="p-4 bg-slate-surface flex items-center justify-between border-b border-slate-border">
              <span className="text-xs font-bold text-slate-text-primary">
                Pratinjau Inspeksi Grid Mat QC 100%
              </span>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-96 w-full bg-slate-900">
              <Image
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80"
                alt="QC Full Inspection"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Buat Tiket Manual */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-status-danger-base text-white flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Terbitkan Tiket Keluhan Baru
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Sistem akan membuat nomor tiket otomatis #LUN-TK-xxx
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTicketOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action="/support" method="post" onSubmit={handleCreateTicketSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Pilih Pesanan Terkait *
                </label>
                <select
                  required
                  value={ticketForm.orderId}
                  onChange={(e) => setTicketForm({ ...ticketForm, orderId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                >
                  {qaOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderCode} - {o.customerName} ({o.productName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Kategori Isu *
                </label>
                <select
                  value={ticketForm.category}
                  onChange={(e) =>
                    setTicketForm({
                      ...ticketForm,
                      category: e.target.value as TicketCategory,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                >
                  <option value="CATEGORY_A">Kategori A: Cacat Fisik / Salah Cetak</option>
                  <option value="CATEGORY_B">Kategori B: Keterlambatan Ekspedisi</option>
                  <option value="CATEGORY_C">Kategori C: Pertanyaan Teknis / Status</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Ringkasan Keluhan / Detail Isu *
                </label>
                <textarea
                  required
                  rows={3}
                  value={ticketForm.issueDetail}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, issueDetail: e.target.value })
                  }
                  placeholder="Deskripsikan komplain pembeli secara spesifik..."
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  PIC Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={ticketForm.assignedPIC}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, assignedPIC: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menerbitkan...' : 'Terbitkan Tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
