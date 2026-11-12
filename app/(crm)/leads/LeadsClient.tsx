'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Clock,
  Send,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Search,
  PlusCircle,
  ShoppingBag,
  Zap,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  Sparkles,
  X,
  Phone,
} from 'lucide-react';
import type { PopulatedLeadItem } from '@/app/actions/leads';
import type { MessageAuditLogItem } from '@/app/actions/messages';
import { formatRelativeTime } from '@/lib/formatters';

interface TemplateItem {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  triggerKey: string;
  category: string;
}

interface LeadsClientProps {
  initialLeads: PopulatedLeadItem[];
  initialTemplates: TemplateItem[];
  initialLogs?: MessageAuditLogItem[];
}

export default function LeadsClient({
  initialLeads,
  initialTemplates,
  initialLogs = [],
}: LeadsClientProps) {
  const [leads, setLeads] = useState<PopulatedLeadItem[]>(initialLeads);
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [messageLogs] = useState<MessageAuditLogItem[]>(initialLogs);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'NEW'>('all');
  const [searchLeadQuery, setSearchLeadQuery] = useState('');
  const [templateCategory, setTemplateCategory] = useState('all');

  // Selected Target Lead for WhatsApp Template
  const [targetLead, setTargetLead] = useState<PopulatedLeadItem | null>(
    initialLeads[0] || null
  );

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Convert to Order
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<PopulatedLeadItem | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    productName: 'Acrylic Keychain 6cm',
    variantName: 'Glitter Sparkle',
    quantity: 2,
    totalPrice: 50000,
    briefNotes: 'Konversi dari chat prospek',
  });

  // Modal State for New Template
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    title: '',
    content: '',
    triggerKey: 'CUSTOM_TEMPLATE',
    category: 'katalog',
  });

  const [isPending, startTransition] = useTransition();

  // Handle Record First Response
  const handleRecordResponse = async (leadId: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'CONTACTED',
              firstResponseAt: new Date().toISOString(),
              frtLabel: 'Baru saja direspon',
              frtBadgeType: 'fast',
            }
          : l
      )
    );

    startTransition(async () => {
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'record_frt', leadId }),
        });
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Replace dynamic template variables with target lead data
  const interpolateTemplate = (content: string, lead: PopulatedLeadItem | null): string => {
    const nama = lead?.prospectName || 'Kak';
    const batchNo = 'Batch #12 Keychain & Artprint';
    const linkKatalog = 'https://lunarchivve.studio/catalog-batch12';
    const orderId = '#LUN-ORD-118';
    const nominalDp = 'Rp 25.000';
    const estimasiBaru = '28 Mei 2024';

    return content
      .replace(/{nama}/g, nama)
      .replace(/{batch_no}/g, batchNo)
      .replace(/{link_katalog}/g, linkKatalog)
      .replace(/{order_id}/g, orderId)
      .replace(/{nominal_dp}/g, nominalDp)
      .replace(/{nominal}/g, nominalDp)
      .replace(/{estimasi_baru}/g, estimasiBaru);
  };

  // Copy template text
  const handleCopyText = (templateId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert Lead to Order
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'convert',
            leadId: convertingLead.id,
            orderData: orderFormData,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          throw new Error(result.error || 'Gagal konversi.');
        }

        setLeads((prev) =>
          prev.map((l) =>
            l.id === convertingLead.id
              ? { ...l, status: 'CONVERTED' }
              : l
          )
        );
        setIsConvertModalOpen(false);
        setConvertingLead(null);
        alert(`Sukses mengonversi prospek ${convertingLead.prospectName} menjadi pesanan PO baru!`);
      } catch (err) {
        alert('Gagal konversi: ' + err);
      }
    });
  };

  // Create New Template
  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateForm.title || !newTemplateForm.content) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_template',
            ...newTemplateForm,
          }),
        });
        const created = await res.json();
        if (!res.ok || created.error) {
          throw new Error(created.error || 'Gagal membuat template.');
        }

        setTemplates((prev) => [...prev, created]);
        setIsNewTemplateModalOpen(false);
        setNewTemplateForm({
          title: '',
          content: '',
          triggerKey: 'CUSTOM_TEMPLATE',
          category: 'katalog',
        });
      } catch (err) {
        alert('Gagal membuat template: ' + err);
      }
    });
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (channelFilter !== 'all') {
      if (channelFilter === 'instagram' && l.inboundChannel !== 'INSTAGRAM_DM') return false;
      if (channelFilter === 'tiktok' && l.inboundChannel !== 'TIKTOK_SHOP') return false;
      if (channelFilter === 'whatsapp' && l.inboundChannel !== 'WHATSAPP') return false;
    }
    if (searchLeadQuery.trim()) {
      const q = searchLeadQuery.toLowerCase();
      const matchName = l.prospectName.toLowerCase().includes(q);
      const matchHandle = l.socialHandle.toLowerCase().includes(q);
      const matchMsg = l.messagePreview.toLowerCase().includes(q);
      if (!matchName && !matchHandle && !matchMsg) return false;
    }
    return true;
  });

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    if (templateCategory === 'all') return true;
    return t.category === templateCategory;
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
              Leads &amp; Template Balasan Cepat
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-channel-whatsapp-surface text-channel-whatsapp-text text-[10px] uppercase tracking-wider font-bold border border-channel-whatsapp-base/20">
              TOWS: W-O (W2 + O2)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/pesan"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold border border-primary/20 transition-colors"
              title="Buka form pemesanan merchandise publik untuk dibagikan ke prospek"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Form Pemesanan (/pesan)</span>
            </Link>
            <div className="flex items-center gap-2 text-channel-whatsapp-text text-xs bg-channel-whatsapp-surface px-3 py-1 rounded-full border border-channel-whatsapp-base/20 font-semibold">
              <Zap className="w-4 h-4 text-channel-whatsapp-base" />
              <span>SLA First Response Time Target &lt; 15 Menit</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="max-w-3xl">
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
            Leads &amp; Fast Follow-Up Management
          </h1>
          <p className="text-slate-text-secondary text-sm mt-1">
            Pantau antrean pesan masuk omni-channel secara real-time, percepat First Response Time (FRT), dan kirim template balasan WhatsApp dinamis sekali klik.
          </p>
        </div>

        {/* 4 Quick Metrics Bento Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div
            onClick={() => {
              setStatusFilter('all');
              setChannelFilter('all');
              setSearchLeadQuery('');
            }}
            role="button"
            className="bg-slate-card hover:bg-slate-surface p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between cursor-pointer transition-all"
            title="Klik untuk melihat semua prospek leads (reset filter)"
          >
            <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
              Total Inbound Leads
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-slate-text-primary">
                {leads.length}
              </span>
              <span className="text-xs text-slate-text-muted">Prospek Masuk</span>
            </div>
            <span className="text-[10px] text-status-success-text font-semibold mt-1">
              Live Omni-Channel Sync
            </span>
          </div>

          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
              Avg First Response (FRT)
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-channel-whatsapp-text">
                8.5
              </span>
              <span className="text-xs text-slate-text-muted">Menit (Target &lt;15m)</span>
            </div>
            <span className="text-[10px] text-status-success-text font-semibold mt-1">
              On Track (-43% vs SLA)
            </span>
          </div>

          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
              Rasio Konversi Lead
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-primary">
                42.8%
              </span>
              <span className="text-xs text-slate-text-muted">Menjadi Pesanan PO</span>
            </div>
            <span className="text-[10px] text-primary font-semibold mt-1">
              TOWS O2 High-Conv
            </span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'all' : 'NEW')}
            role="button"
            className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
              statusFilter === 'NEW'
                ? 'bg-status-danger-surface border-status-danger-base ring-2 ring-status-danger-base'
                : 'bg-status-danger-surface border-status-danger-border hover:border-status-danger-base'
            }`}
            title="Klik untuk memfilter hanya leads yang belum dibalas (Pending)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-status-danger-text uppercase tracking-wider">
                Pending Follow-Up {statusFilter === 'NEW' ? '• [Aktif]' : '• Filter'}
              </span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger-base opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-danger-base" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-bold text-status-danger-text">
                {leads.filter((l) => l.status === 'NEW').length}
              </span>
              <span className="text-xs text-status-danger-text font-semibold">
                Menunggu Balasan
              </span>
            </div>
            <span className="text-[10px] text-status-danger-text font-bold mt-1">
              {statusFilter === 'NEW'
                ? 'Menampilkan prospek status Baru. Klik lagi untuk reset.'
                : '1 Prospek Kritis (>25 Menit)'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Main Asymmetric Layout: 60% Left (Leads Table) / 40% Right (Template Library) */}
      <section className="px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols / 60%): Leads Inbound Table */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-5 flex flex-col gap-4">
            {/* Header & Channel Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-text-primary">
                  Antrean Leads Masuk
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-bold">
                  {filteredLeads.length} Aktif
                </span>
              </div>

              {/* Channel Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setChannelFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    channelFilter === 'all'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                  }`}
                >
                  Semua ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter('instagram')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    channelFilter === 'instagram'
                      ? 'bg-channel-instagram-base text-white shadow-xs'
                      : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                  }`}
                >
                  Instagram ({leads.filter((l) => l.inboundChannel === 'INSTAGRAM_DM').length})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter('tiktok')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    channelFilter === 'tiktok'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                  }`}
                >
                  TikTok ({leads.filter((l) => l.inboundChannel === 'TIKTOK_SHOP').length})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter('whatsapp')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    channelFilter === 'whatsapp'
                      ? 'bg-channel-whatsapp-base text-white shadow-xs'
                      : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                  }`}
                >
                  WhatsApp ({leads.filter((l) => l.inboundChannel === 'WHATSAPP').length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchLeadQuery}
                onChange={(e) => setSearchLeadQuery(e.target.value)}
                placeholder="Cari prospek, @handle medsos, kata kunci..."
                className="w-full pl-9 pr-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-surface/70 text-slate-text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-slate-border select-none">
                    <th className="py-3 px-3 pl-4">Prospek &amp; Medsos</th>
                    <th className="py-3 px-3">Kanal</th>
                    <th className="py-3 px-3">Waktu Masuk</th>
                    <th className="py-3 px-3">FRT SLA</th>
                    <th className="py-3 px-3">Status Lead</th>
                    <th className="py-3 px-3 pr-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-text-muted">
                        Tidak ada pesan masuk.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const isTarget = targetLead?.id === l.id;
                      return (
                        <tr
                          key={l.id}
                          onClick={() => setTargetLead(l)}
                          className={`transition-colors cursor-pointer ${
                            isTarget
                              ? 'bg-surface-container-low font-medium'
                              : 'hover:bg-slate-surface'
                          }`}
                        >
                          <td className="py-3 px-3 pl-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-primary shrink-0 border border-slate-border">
                                {l.prospectName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-text-primary truncate">
                                  {l.socialHandle} ({l.prospectName})
                                </span>
                                <span className="text-[11px] text-slate-text-muted truncate max-w-[170px]">
                                  {l.messagePreview}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-surface border border-slate-border">
                              {l.inboundChannel === 'INSTAGRAM_DM'
                                ? 'IG DM'
                                : l.inboundChannel === 'TIKTOK_SHOP'
                                ? 'TikTok'
                                : 'WhatsApp'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-text-secondary whitespace-nowrap text-[11px]">
                            {formatRelativeTime(l.inboundAt)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.frtBadgeType === 'fast'
                                  ? 'bg-status-success-surface text-status-success-text'
                                  : l.frtBadgeType === 'warning'
                                  ? 'bg-status-warning-surface text-status-warning-text'
                                  : 'bg-status-danger-surface text-status-danger-text animate-pulse'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{l.frtLabel}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.status === 'CONVERTED'
                                  ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                                  : l.status === 'CONTACTED'
                                  ? 'bg-surface-container text-primary'
                                  : 'bg-status-warning-surface text-status-warning-text'
                              }`}
                            >
                              {l.status === 'CONVERTED'
                                ? 'Converted ✅'
                                : l.status === 'CONTACTED'
                                ? 'Contacted'
                                : 'New / Antre'}
                            </span>
                          </td>
                          <td className="py-3 px-3 pr-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {l.status === 'NEW' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRecordResponse(l.id);
                                  }}
                                  title="Catat Respon Pertama"
                                  className="px-2 py-1 rounded bg-slate-surface hover:bg-surface-container text-slate-text-primary text-[10px] font-bold border border-slate-border cursor-pointer"
                                >
                                  Catat Balas
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvertingLead(l);
                                  setIsConvertModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-primary-container hover:bg-secondary text-white text-[10px] font-bold shadow-xs cursor-pointer"
                              >
                                Convert to PO
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols / 40%): WhatsApp Template Library */}
        <aside className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-text-primary">
                  Pustaka Balasan Cepat
                </h2>
                <p className="text-[11px] text-slate-text-secondary mt-0.5">
                  Template terstandardisasi dengan variabel dinamis &amp; wa.me link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                title="Tambah Template Baru"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Target Lead Context Banner */}
            {targetLead && (
              <div className="p-3 bg-surface-container-low rounded-xl border border-slate-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">
                    {targetLead.prospectName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-text-muted font-semibold uppercase">
                      Target Prospek Aktif
                    </span>
                    <span className="text-xs font-bold text-slate-text-primary">
                      {targetLead.prospectName} ({targetLead.socialHandle})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-text-primary bg-slate-card px-2 py-0.5 rounded border border-slate-border">
                  <Phone className="w-3 h-3 text-channel-whatsapp-base" />
                  <span>{targetLead.phone || '0812-9844-8821'}</span>
                </div>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-surface rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setTemplateCategory('all')}
                className={`flex-1 py-1 text-center text-xs rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templateCategory === 'all'
                    ? 'bg-slate-card text-primary shadow-2xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategory('katalog')}
                className={`flex-1 py-1 text-center text-xs rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templateCategory === 'katalog'
                    ? 'bg-slate-card text-primary shadow-2xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Katalog &amp; PO
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategory('pembayaran')}
                className={`flex-1 py-1 text-center text-xs rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templateCategory === 'pembayaran'
                    ? 'bg-slate-card text-primary shadow-2xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Konfirmasi Bayar
              </button>
              <button
                type="button"
                onClick={() => setTemplateCategory('eskalasi')}
                className={`flex-1 py-1 text-center text-xs rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                  templateCategory === 'eskalasi'
                    ? 'bg-slate-card text-primary shadow-2xs'
                    : 'text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                Eskalasi Vendor
              </button>
            </div>

            {/* Templates List Cards */}
            <div className="flex flex-col gap-3">
              {filteredTemplates.map((t, idx) => {
                const interpolatedText = interpolateTemplate(t.content, targetLead);
                const phone = targetLead?.phone
                  ? targetLead.phone.replace(/^0/, '62')
                  : '6281298448821';
                const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
                  interpolatedText
                )}`;
                const tId = t._id || t.id || `t-${idx}`;

                return (
                  <div
                    key={tId}
                    className="p-4 rounded-xl bg-slate-surface border border-slate-border flex flex-col gap-2.5 shadow-xs hover:border-slate-border-strong transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-slate-text-primary">
                          {t.title}
                        </h3>
                        <span className="text-[10px] text-primary font-mono font-semibold">
                          #{t.triggerKey}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-status-success-surface text-status-success-text text-[10px] font-bold">
                        TOWS Ready
                      </span>
                    </div>

                    {/* WhatsApp Bubble Preview */}
                    <div className="p-3 bg-slate-card rounded-lg border border-slate-border text-xs text-slate-text-primary relative overflow-hidden font-sans leading-relaxed">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-channel-whatsapp-base" />
                      <p className="whitespace-pre-wrap">{interpolatedText}</p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyText(tId, interpolatedText)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-card hover:bg-slate-surface text-slate-text-primary rounded-lg text-xs font-bold border border-slate-border shadow-xs transition-colors cursor-pointer"
                      >
                        {copiedId === tId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-status-success-base" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-text-muted" />
                            <span>Salin Teks</span>
                          </>
                        )}
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-channel-whatsapp-base hover:bg-channel-whatsapp-text text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Buka wa.me (Click-to-Chat)</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      {/* 2.5 SECTION C: Tabel Riwayat Pengiriman WhatsApp (Message Audit Log) */}
      <section className="px-8 pb-8">
        <div className="bg-slate-card rounded-2xl border border-slate-border shadow-xs p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-channel-whatsapp-surface border border-channel-whatsapp-base/20 text-channel-whatsapp-text flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-text-primary">
                  Tabel Riwayat Notifikasi &amp; Pesan WhatsApp (Message Audit Log)
                </h2>
                <p className="text-xs text-slate-text-secondary mt-0.5">
                  Audit log riwayat pengiriman sapaan otomatis, konfirmasi pesanan, dan update status produksi via WhatsApp.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-channel-whatsapp-surface text-channel-whatsapp-text font-bold text-[11px] self-start sm:self-center border border-channel-whatsapp-base/20">
              {messageLogs.length} Pesan Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-surface text-slate-text-muted uppercase text-[10px] font-bold border-b border-slate-border tracking-wider">
                <tr>
                  <th className="py-3 px-4">Penerima &amp; Kontak</th>
                  <th className="py-3 px-4">Template / Pemicu</th>
                  <th className="py-3 px-4">Pratinjau Pesan</th>
                  <th className="py-3 px-4">Pengirim</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Waktu Kirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {messageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-text-muted">
                      Belum ada riwayat pesan keluar.
                    </td>
                  </tr>
                ) : (
                  messageLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-surface/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-text-primary">{log.recipientName}</div>
                        <div className="text-[11px] font-mono text-slate-text-muted">{log.maskedPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-surface-container text-primary">
                          #{log.templateKey}
                        </span>
                        <div className="text-[11px] text-slate-text-secondary mt-0.5 font-medium">
                          {log.templateTitle}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="truncate text-slate-text-secondary text-xs" title={log.messageContent}>
                          {log.messageContent}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-text-secondary font-medium">
                        {log.dispatchedBy}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'DELIVERED'
                              ? 'bg-status-success-surface text-status-success-text border border-status-success-border'
                              : 'bg-surface-container text-primary'
                          }`}
                        >
                          {log.status === 'DELIVERED' ? 'Terkirim (Delivered)' : 'Terkirim'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-text-muted text-[11px] whitespace-nowrap">
                        {formatRelativeTime(log.dispatchedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Modal: Convert to PO */}
      {isConvertModalOpen && convertingLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Konversi Lead ke Pesanan PO
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Prospek {convertingLead.prospectName} akan dijadikan pelanggan &amp; order resmi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action="/leads" method="post" onSubmit={handleConvertSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Nama Produk Kustom *
                </label>
                <input
                  type="text"
                  required
                  value={orderFormData.productName}
                  onChange={(e) =>
                    setOrderFormData({ ...orderFormData, productName: e.target.value })
                  }
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
                    value={orderFormData.variantName}
                    onChange={(e) =>
                      setOrderFormData({ ...orderFormData, variantName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
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
                    value={orderFormData.quantity}
                    onChange={(e) =>
                      setOrderFormData({
                        ...orderFormData,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Total Nilai Pesanan (IDR) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={orderFormData.totalPrice}
                  onChange={(e) =>
                    setOrderFormData({
                      ...orderFormData,
                      totalPrice: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Catatan Brief
                </label>
                <input
                  type="text"
                  value={orderFormData.briefNotes}
                  onChange={(e) =>
                    setOrderFormData({ ...orderFormData, briefNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Mengonversi...' : 'Konfirmasi Pesanan Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Tambah Template Baru */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Buat Template WhatsApp Baru
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Gunakan tagar seperti &#123;nama&#125;, &#123;batch_no&#125;, &#123;link_katalog&#125;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action="/leads" method="post" onSubmit={handleCreateTemplateSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Judul Template *
                </label>
                <input
                  type="text"
                  required
                  value={newTemplateForm.title}
                  onChange={(e) =>
                    setNewTemplateForm({ ...newTemplateForm, title: e.target.value })
                  }
                  placeholder="Contoh: Ucapan Ulang Tahun & Diskon"
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Kategori
                  </label>
                  <select
                    value={newTemplateForm.category}
                    onChange={(e) =>
                      setNewTemplateForm({ ...newTemplateForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="katalog">Katalog &amp; PO</option>
                    <option value="pembayaran">Konfirmasi Bayar</option>
                    <option value="eskalasi">Eskalasi Vendor</option>
                    <option value="qa">QA / Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Trigger Key
                  </label>
                  <input
                    type="text"
                    value={newTemplateForm.triggerKey}
                    onChange={(e) =>
                      setNewTemplateForm({ ...newTemplateForm, triggerKey: e.target.value })
                    }
                    placeholder="PROMO_SPECIAL"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Konten Pesan *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newTemplateForm.content}
                  onChange={(e) =>
                    setNewTemplateForm({ ...newTemplateForm, content: e.target.value })
                  }
                  placeholder="Halo kak {nama}, terima kasih telah memesan di {batch_no}..."
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
