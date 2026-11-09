'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Kanban,
  AlertTriangle,
  Clock,
  Printer,
  PlusCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Truck,
  Sparkles,
  X,
  Factory,
  Search,
  Filter,
  Eye,
  Send,
  Phone,
} from 'lucide-react';
import Image from 'next/image';
import {
  PipelineBoardData,
  OrderPopulatedItem,
  updateOrderStatus,
  createOrder,
} from '@/app/actions/orders';
import { PipelineStatus } from '@/models/Order';
import { formatRupiah } from '@/lib/formatters';

interface PipelineClientProps {
  initialBoard: PipelineBoardData;
  customersList: Array<{ id: string; fullName: string; customerId: string }>;
}

const STAGES: Array<{ key: PipelineStatus; label: string; desc: string; dotColor: string }> = [
  {
    key: 'ORDER_MASUK',
    label: 'Order Masuk',
    desc: 'Verifikasi DP & rekap format',
    dotColor: 'bg-slate-400',
  },
  {
    key: 'DESAIN_APPROVAL',
    label: 'Desain & Brief',
    desc: 'Review cutline & mockup artwork',
    dotColor: 'bg-secondary',
  },
  {
    key: 'PRODUKSI_VENDOR',
    label: 'Produksi Vendor',
    desc: 'Pabrikasi maklon massal & UV print',
    dotColor: 'bg-channel-web-base',
  },
  {
    key: 'QA_PACKING',
    label: 'QA & Packing',
    desc: 'Pemeriksaan fisik & QC packing',
    dotColor: 'bg-status-warning-base',
  },
  {
    key: 'SELESAI',
    label: 'Siap Kirim / Selesai',
    desc: 'Resi generated & paket pickup',
    dotColor: 'bg-status-success-base',
  },
];

export default function PipelineClient({ initialBoard, customersList }: PipelineClientProps) {
  const [board, setBoard] = useState<PipelineBoardData>(initialBoard);
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  // Create Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    customerId: string;
    productName: string;
    variantName: string;
    quantity: number;
    totalPrice: number;
    batchName: string;
    briefNotes: string;
    paymentStatus: 'PENDING_DP' | 'DP_PAID' | 'LUNAS';
  }>({
    customerId: customersList[0]?.id || '',
    productName: 'Acrylic Keychain 6cm',
    variantName: 'Glitter Sparkle',
    quantity: 2,
    totalPrice: 50000,
    batchName: 'Batch #12 Keychain & Artprint',
    briefNotes: 'Double side with star clasp',
    paymentStatus: 'LUNAS',
  });

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderPopulatedItem | null>(null);

  // Filtered board based on search & batch
  const filteredBoard = useMemo(() => {
    const q = kanbanSearch.toLowerCase().trim();
    const result: Record<PipelineStatus, OrderPopulatedItem[]> = {
      ORDER_MASUK: [],
      DESAIN_APPROVAL: [],
      PRODUKSI_VENDOR: [],
      QA_PACKING: [],
      SELESAI: [],
    };

    for (const stg of STAGES) {
      result[stg.key] = board[stg.key].filter((item) => {
        // Batch filter
        if (batchFilter !== 'ALL') {
          if (batchFilter === 'BATCH12' && !item.batchName.includes('12')) return false;
          if (batchFilter === 'BATCH11' && !item.batchName.includes('11')) return false;
        }

        // Search query
        if (q) {
          const matchCode = item.orderCode.toLowerCase().includes(q);
          const matchCust = item.customerName.toLowerCase().includes(q);
          const matchProd = item.productName.toLowerCase().includes(q);
          const matchVar = item.variantName.toLowerCase().includes(q);
          const matchBrief = item.briefNotes.toLowerCase().includes(q);
          if (!matchCode && !matchCust && !matchProd && !matchVar && !matchBrief) return false;
        }

        return true;
      });
    }

    return result;
  }, [board, batchFilter, kanbanSearch]);

  // Handle stage transition
  const handleMoveStage = (
    orderId: string,
    currentStage: PipelineStatus,
    targetStage: PipelineStatus
  ) => {
    let movedItem: OrderPopulatedItem | null = null;
    const updatedBoard = { ...board };

    updatedBoard[currentStage] = updatedBoard[currentStage].filter((item) => {
      if (item.id === orderId) {
        movedItem = { ...item, pipelineStatus: targetStage, daysInStage: 1, stuckAlert: false };
        return false;
      }
      return true;
    });

    if (movedItem) {
      updatedBoard[targetStage] = [movedItem, ...updatedBoard[targetStage]];
      setBoard(updatedBoard);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(movedItem);
      }
    }

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, targetStage);
      } catch (err) {
        alert('Gagal memindahkan status: ' + err);
      }
    });
  };

  // Move via arrow buttons
  const handleStepStage = (orderId: string, currentStage: PipelineStatus, direction: 'next' | 'prev') => {
    const stageKeys = STAGES.map((s) => s.key);
    const currentIndex = stageKeys.indexOf(currentStage);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= stageKeys.length) return;
    handleMoveStage(orderId, currentStage, stageKeys[nextIndex]);
  };

  // Handle Create Order Submit
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.productName) return;

    startTransition(async () => {
      try {
        const newOrd = await createOrder(formData);
        const selectedCust = customersList.find((c) => c.id === formData.customerId);

        const newItem: OrderPopulatedItem = {
          id: newOrd._id,
          orderCode: newOrd.orderCode,
          customerId: formData.customerId,
          customerName: selectedCust?.fullName || 'Pelanggan',
          customerSegment: 'REGULAR',
          customerChannel: 'WHATSAPP',
          customerPhone: '',
          productName: newOrd.productName,
          variantName: newOrd.variantName,
          quantity: newOrd.quantity,
          totalPrice: newOrd.totalPrice,
          batchName: newOrd.batchName,
          briefNotes: newOrd.briefNotes,
          designUrl: '',
          pipelineStatus: 'ORDER_MASUK',
          stuckAlert: false,
          daysInStage: 1,
          paymentStatus: newOrd.paymentStatus,
          vendorName: 'Vendor Akrilik Jaya',
          enteredStageAt: newOrd.enteredStageAt,
          createdAt: newOrd.createdAt,
        };

        setBoard((prev) => ({
          ...prev,
          ORDER_MASUK: [newItem, ...prev.ORDER_MASUK],
          stats: {
            ...prev.stats,
            totalOrders: prev.stats.totalOrders + 1,
            totalRevenue: prev.stats.totalRevenue + newOrd.totalPrice,
          },
        }));

        setIsModalOpen(false);
      } catch (err) {
        alert('Gagal membuat pesanan: ' + err);
      }
    });
  };

  return (
    <div className="flex flex-col w-full">
      {/* 1. Top Meta Header */}
      <section className="px-8 pt-6 pb-2 flex flex-col gap-4">
        {/* Breadcrumb & Strategy Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-text-muted text-xs">
            <span className="hover:text-slate-text-primary transition-colors cursor-pointer">
              CRM
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-text-primary font-semibold">
              Pesanan &amp; Pipeline
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] uppercase tracking-wider font-bold">
              TOWS: W-T (W1 + T2)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-text-secondary text-xs bg-surface-container-low px-3 py-1 rounded-full border border-slate-border">
            <RefreshCw className="w-3.5 h-3.5 text-status-success-base" />
            <span>Sinkronisasi otomatis aktif • Batch #12 Live</span>
          </div>
        </div>

        {/* Main Title & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
              Pipeline Pemesanan &amp; Alur Produksi Pre-Order
            </h1>
            <p className="text-slate-text-secondary text-sm max-w-3xl">
              Monitoring terintegrasi 5 tahap siklus PO merchandise: verifikasi brief, persetujuan artwork, pabrikasi vendor maklon, hingga QA inspection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-card hover:bg-slate-surface text-slate-text-primary rounded-lg text-xs font-semibold border border-slate-border shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-text-secondary" />
              <span>Cetak Manifest</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-secondary text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>+ Buat Pesanan Manual</span>
            </button>
          </div>
        </div>

        {/* 4 Quick Metrics Bento Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Batch Info */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Batch PO Aktif
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-success-surface text-status-success-text">
                Running
              </span>
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-slate-text-primary">
                Batch #12 Keychain &amp; Print
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-slate-text-primary">
                  {board.stats.totalOrders}
                </span>
                <span className="text-xs text-slate-text-muted">
                  Pesanan ({formatRupiah(board.stats.totalRevenue)})
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Dalam Pabrikasi */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Dalam Pabrikasi
              </span>
              <div className="w-6 h-6 rounded-full bg-surface-container-low flex items-center justify-center text-channel-web-text">
                <Factory className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-text-primary">
                  {board.PRODUKSI_VENDOR.length}
                </span>
                <span className="text-xs text-channel-web-text font-semibold">
                  Pesanan di Vendor
                </span>
              </div>
              <div className="w-full bg-slate-surface rounded-full h-1.5 mt-2 overflow-hidden border border-slate-border">
                <div
                  className="bg-channel-web-base h-1.5 rounded-full"
                  style={{
                    width: `${
                      board.stats.totalOrders > 0
                        ? (board.PRODUKSI_VENDOR.length / board.stats.totalOrders) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Overdue SLA Critical */}
          <div className="bg-status-danger-surface p-4 rounded-xl border border-status-danger-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-status-danger-text uppercase tracking-wider">
                Perlu Perhatian (SLA)
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger-base opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-danger-base" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-status-danger-text">
                  {board.stats.overdueSLA}
                </span>
                <span className="text-xs text-status-danger-text font-semibold">
                  Pesanan Overdue &gt;3 Hari
                </span>
              </div>
              <p className="text-[11px] text-status-danger-text mt-1">
                Vendor Maklon bottleneck perlu eskalasi segera (TOWS W1+T2).
              </p>
            </div>
          </div>

          {/* Card 4: Siap Kirim Hari Ini */}
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Siap Pick-Up Hari Ini
              </span>
              <div className="w-6 h-6 rounded-full bg-status-success-surface flex items-center justify-center text-status-success-text">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-status-success-text">
                  {board.QA_PACKING.length + board.SELESAI.length}
                </span>
                <span className="text-xs text-slate-text-muted">
                  Pesanan Lolos QC
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-text-secondary">
                <CheckCircle2 className="w-3.5 h-3.5 text-status-success-base" />
                <span>Siap dijemput J&amp;T &amp; SiCepat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Filter & Search Toolbar for Kanban */}
        <div className="bg-slate-card rounded-xl p-3 border border-slate-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-text-muted pointer-events-none" />
            <input
              type="text"
              value={kanbanSearch}
              onChange={(e) => setKanbanSearch(e.target.value)}
              placeholder="Filter kartu order berdasarkan nama, kode, atau produk..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
            />
            {kanbanSearch && (
              <button
                type="button"
                onClick={() => setKanbanSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-text-muted shrink-0">Filter Batch:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-slate-surface text-slate-text-primary text-xs py-1.5 px-3 rounded-lg border border-slate-border font-medium cursor-pointer focus:outline-none"
            >
              <option value="ALL">Semua Batch PO</option>
              <option value="BATCH12">Batch #12 Keychain &amp; Print (Aktif)</option>
              <option value="BATCH11">Batch #11 Summer Merch</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. 5-Stage Visual Kanban Board Container */}
      <section className="px-8 py-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 min-w-[1200px] items-start">
          {STAGES.map((stg) => {
            const cards = filteredBoard[stg.key] || [];

            return (
              <div
                key={stg.key}
                className="flex flex-col bg-slate-surface rounded-xl p-3 border border-slate-border gap-3 min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between px-1 py-1 border-b border-slate-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stg.dotColor}`} />
                    <span className="text-xs font-bold text-slate-text-primary">
                      {stg.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-card text-slate-text-primary shadow-2xs border border-slate-border">
                    {cards.length}
                  </span>
                </div>
                <p className="px-1 text-[11px] text-slate-text-muted leading-tight">
                  {stg.desc}
                </p>

                {/* Cards Stack */}
                <div className="flex flex-col gap-3">
                  {cards.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-text-muted italic border border-dashed border-slate-border rounded-xl">
                      Tidak ada pesanan di tahap ini.
                    </div>
                  ) : (
                    cards.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedOrder(item)}
                        className={`bg-slate-card p-3.5 rounded-xl border shadow-xs transition-all relative overflow-hidden flex flex-col gap-2 cursor-pointer ${
                          item.stuckAlert
                            ? 'border-status-danger-base ring-1 ring-status-danger-base/30'
                            : 'border-slate-border hover:border-slate-border-strong hover:shadow-md'
                        }`}
                      >
                        {/* High-visibility Overdue Alert Banner */}
                        {item.stuckAlert && (
                          <div className="bg-status-danger-surface text-status-danger-text px-2.5 py-1 -mx-3.5 -mt-3.5 mb-1 flex items-center justify-between text-[10px] font-bold border-b border-status-danger-border">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-status-danger-base" />
                              <span>Macet &gt;3 Hari (SLA Terlampaui)</span>
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-status-danger-base text-white text-[9px]">
                              W-T
                            </span>
                          </div>
                        )}

                        {/* Top: Order Code & Channel */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-primary font-bold">
                            {item.orderCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-surface text-slate-text-secondary font-medium border border-slate-border">
                            {item.customerChannel.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-text-primary truncate max-w-[130px]">
                            {item.customerName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container text-primary font-semibold">
                            {item.customerSegment.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Product Thumbnail & Variant */}
                        <div className="flex items-center gap-2.5 bg-slate-surface p-2 rounded-lg border border-slate-border/50">
                          <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center font-bold text-xs text-primary shrink-0 border border-slate-border">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-text-primary truncate">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-slate-text-muted truncate">
                              {item.variantName} • {item.quantity} pcs
                            </div>
                          </div>
                        </div>

                        {/* Vendor Tag if Produksi Vendor */}
                        {item.pipelineStatus === 'PRODUKSI_VENDOR' && (
                          <div className="bg-surface-container-low px-2 py-1 rounded text-[10px] flex items-center justify-between text-slate-text-secondary border border-slate-border/40">
                            <span className="truncate">{item.vendorName}</span>
                            <span
                              className={`font-bold ${
                                item.stuckAlert ? 'text-status-danger-text' : 'text-status-success-text'
                              }`}
                            >
                              {item.stuckAlert ? 'Delay UV' : 'On Schedule'}
                            </span>
                          </div>
                        )}

                        {/* Overdue Vendor Fast Follow Up Button */}
                        {item.stuckAlert && (
                          <a
                            href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                              `Halo Vendor Akrilik Jaya, mohon konfirmasi status pengerjaan pesanan ${item.orderCode} (${item.productName}) yang tertahan lebih dari 3 hari. Terima kasih!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="py-1 px-2 rounded-lg bg-status-danger-base hover:bg-status-danger-base/90 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>Follow-Up Vendor WA</span>
                          </a>
                        )}

                        {/* Price & Days in Stage SLA */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-border/60">
                          <span className="font-bold text-slate-text-primary">
                            {formatRupiah(item.totalPrice)}
                          </span>
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              item.stuckAlert ? 'text-status-danger-text font-bold' : 'text-slate-text-muted'
                            }`}
                          >
                            <Clock className="w-3 h-3" /> Hari ke-{item.daysInStage}
                          </span>
                        </div>

                        {/* Stage Transition Control Arrows */}
                        <div
                          className="flex items-center justify-between gap-1 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleStepStage(item.id, stg.key, 'prev')}
                            title="Kembalikan ke tahap sebelumnya"
                            className="p-1 rounded hover:bg-slate-surface text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <span className="text-[10px] text-slate-text-muted italic">
                            Klik kartu utk detail
                          </span>

                          <button
                            type="button"
                            onClick={() => handleStepStage(item.id, stg.key, 'next')}
                            title="Lanjutkan ke tahap berikutnya"
                            className="px-2 py-1 rounded bg-primary-container hover:bg-secondary text-white text-[10px] font-bold flex items-center gap-0.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Lanjut</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Detail Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-primary-container text-white font-mono text-xs font-bold">
                  {selectedOrder.orderCode}
                </span>
                <span className="text-sm font-bold text-slate-text-primary">
                  Detail Pesanan Merchandise
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-surface p-3 rounded-xl border border-slate-border">
                <div>
                  <span className="text-slate-text-muted text-[10px] uppercase font-bold">Pemesan</span>
                  <p className="font-bold text-slate-text-primary text-sm mt-0.5">
                    {selectedOrder.customerName}
                  </p>
                  <span className="text-slate-text-secondary">{selectedOrder.customerSegment}</span>
                </div>
                <div>
                  <span className="text-slate-text-muted text-[10px] uppercase font-bold">Batch PO</span>
                  <p className="font-bold text-slate-text-primary mt-0.5">{selectedOrder.batchName}</p>
                  <span className="text-status-success-text font-bold">
                    {formatRupiah(selectedOrder.totalPrice)} ({selectedOrder.paymentStatus})
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-slate-text-muted font-bold text-[11px]">Produk &amp; Varian</span>
                <p className="text-slate-text-primary font-bold text-sm">
                  {selectedOrder.productName} ({selectedOrder.quantity} pcs)
                </p>
                <p className="text-slate-text-secondary">{selectedOrder.variantName}</p>
                {selectedOrder.briefNotes && (
                  <p className="p-2.5 bg-slate-surface rounded-lg border border-slate-border text-slate-text-secondary mt-1">
                    <strong>Catatan Brief:</strong> {selectedOrder.briefNotes}
                  </p>
                )}
              </div>

              {/* Direct Stage Mutation inside Modal */}
              <div className="pt-2 border-t border-slate-border flex flex-col gap-1.5">
                <span className="text-slate-text-primary font-bold">Pindahkan Tahap Alur Kerja:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleMoveStage(selectedOrder.id, selectedOrder.pipelineStatus, s.key)}
                      className={`p-2 rounded-lg text-left text-[11px] font-bold border transition-all cursor-pointer ${
                        selectedOrder.pipelineStatus === s.key
                          ? 'bg-primary-container text-white border-primary shadow-xs'
                          : 'bg-slate-surface hover:bg-surface-container text-slate-text-primary border-slate-border'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <a
                  href="/support"
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Buka Lembar QC</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Buat Pesanan Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Buat Pesanan Pre-Order Manual
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Pesanan otomatis masuk ke tahap (1) Order Masuk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action="/pipeline" method="post" onSubmit={handleCreateOrderSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Pilih Pelanggan Terdaftar *
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerId} - {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Nama Produk Merchandise *
                </label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="Contoh: Acrylic Keychain 6cm"
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Varian &amp; Finishing
                  </label>
                  <input
                    type="text"
                    value={formData.variantName}
                    onChange={(e) => setFormData({ ...formData, variantName: e.target.value })}
                    placeholder="Contoh: Glitter Sparkle"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Jumlah (Qty) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Total Nominal (IDR) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={formData.totalPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, totalPrice: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Status Bayar
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentStatus: e.target.value as 'PENDING_DP' | 'DP_PAID' | 'LUNAS',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="LUNAS">Lunas</option>
                    <option value="DP_PAID">DP 50%</option>
                    <option value="PENDING_DP">Menunggu DP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Catatan Brief &amp; Aksesoris
                </label>
                <textarea
                  rows={2}
                  value={formData.briefNotes}
                  onChange={(e) => setFormData({ ...formData, briefNotes: e.target.value })}
                  placeholder="Misal: Clasp star gold, kartu backing foil holo"
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Terbitkan Pesanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
