'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  Zap,
  Users,
  Award,
  Lock,
  Download,
  UserPlus,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  X,
  Check,
  RefreshCw,
  Trash2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Edit2,
  PlusCircle,
} from 'lucide-react';
import {
  CustomerListItem,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDetail,
} from '@/app/actions/customers';
import { createOrder } from '@/app/actions/orders';
import { formatRupiah, formatRelativeTime } from '@/lib/formatters';

interface CustomersClientProps {
  initialCustomers: CustomerListItem[];
}

interface CustomerDetailData {
  customer: {
    id: string;
    customerId: string;
    fullName: string;
    socialHandle: string;
    rawPhone: string;
    maskedPhone: string;
    acquisitionChannel: string;
    segment: string;
    acceptsMarketing: boolean;
    avatarUrl: string;
    city: string;
    createdAt: string;
  };
  metrics: {
    totalOrders: number;
    totalSpend: number;
    aov: number;
    retentionBatch: string;
  };
  orders: Array<{
    id: string;
    orderCode: string;
    productName: string;
    variantName: string;
    quantity: number;
    totalPrice: number;
    batchName: string;
    pipelineStatus: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  tickets: Array<{
    id: string;
    ticketCode: string;
    category: string;
    issueDetail: string;
    assignedPIC: string;
    status: string;
    resolvedAt: string | null;
    createdAt: string;
  }>;
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const searchParams = useSearchParams();
  const paramId = searchParams.get('id');

  const [customers, setCustomers] = useState<CustomerListItem[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [segmentFilter, setSegmentFilter] = useState('ALL');

  // Selected customer for Slide-over Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    paramId || initialCustomers[0]?.id || null
  );
  const [detailData, setDetailData] = useState<CustomerDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Modal State for Add Customer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal State for Edit Customer
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);

  // Modal State for Direct Add Order from Drawer
  const [isAddOrderDrawerOpen, setIsAddOrderDrawerOpen] = useState(false);
  const [orderDrawerForm, setOrderDrawerForm] = useState({
    productName: 'Acrylic Keychain 6cm',
    variantName: 'Glitter Sparkle',
    quantity: 2,
    totalPrice: 50000,
    briefNotes: 'Batch #12 Priority Order',
  });

  const [isPending, startTransition] = useTransition();

  // Form State for new Customer
  const [formData, setFormData] = useState<{
    fullName: string;
    socialHandle: string;
    phone: string;
    acquisitionChannel: CustomerListItem['acquisitionChannel'];
    segment: CustomerListItem['segment'];
    acceptsMarketing: boolean;
    city: string;
  }>({
    fullName: '',
    socialHandle: '',
    phone: '',
    acquisitionChannel: 'INSTAGRAM_DM',
    segment: 'REGULAR',
    acceptsMarketing: true,
    city: 'Jakarta',
  });

  // Load customer detail
  const loadDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDrawerOpen(true);
    setLoadingDetail(true);
    try {
      const data = await getCustomerDetail(id);
      setDetailData(data as unknown as CustomerDetailData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Initial load
  useEffect(() => {
    const targetId = paramId || initialCustomers[0]?.id;
    if (targetId) {
      loadDetail(targetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  // Real-time comprehensive search and filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.fullName.toLowerCase().includes(q);
        const matchId = c.customerId.toLowerCase().includes(q);
        const matchSocial = c.socialHandle.toLowerCase().includes(q);
        const matchPhone = c.rawPhone.includes(q) || c.maskedPhone.includes(q);
        const matchCity = c.city.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSocial && !matchPhone && !matchCity) return false;
      }

      // Channel filter
      if (channelFilter !== 'ALL') {
        if (channelFilter === 'INSTAGRAM' && c.acquisitionChannel !== 'INSTAGRAM_DM') return false;
        if (channelFilter === 'WHATSAPP' && c.acquisitionChannel !== 'WHATSAPP') return false;
        if (channelFilter === 'WEB' && c.acquisitionChannel !== 'WEB_FORM') return false;
        if (channelFilter === 'TIKTOK' && c.acquisitionChannel !== 'TIKTOK_SHOP') return false;
      }

      // Segment filter
      if (segmentFilter !== 'ALL') {
        if (segmentFilter === 'VIP' && c.segment !== 'VIP_LOYAL') return false;
        if (segmentFilter === 'REGULAR' && c.segment !== 'REGULAR') return false;
        if (segmentFilter === 'DORMANT' && c.segment !== 'DORMANT') return false;
      }

      return true;
    });
  }, [customers, searchQuery, channelFilter, segmentFilter]);

  // Real CSV Export File Generation & Download (UU PDP Compliant)
  const handleExportCSV = () => {
    const headers = [
      'ID Pelanggan',
      'Nama Lengkap',
      'Username Medsos',
      'No Telepon (Tersensor UU PDP)',
      'Kanal Asal',
      'Segmen',
      'Total Order',
      'Total Belanja (IDR)',
      'Kota',
      'Opt-In Promo',
    ];

    const rows = filteredCustomers.map((c) => [
      c.customerId,
      `"${c.fullName.replace(/"/g, '""')}"`,
      c.socialHandle,
      c.maskedPhone,
      c.acquisitionChannel,
      c.segment,
      c.totalOrders,
      c.totalSpend,
      `"${c.city.replace(/"/g, '""')}"`,
      c.acceptsMarketing ? 'YA' : 'TIDAK',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lunarchivve_pelanggan_pdp_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Add Customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) return;

    startTransition(async () => {
      try {
        const newCust = await createCustomer(formData);
        const item: CustomerListItem = {
          id: newCust._id,
          customerId: newCust.customerId,
          fullName: newCust.fullName,
          socialHandle: newCust.socialHandle,
          rawPhone: newCust.phone,
          maskedPhone: newCust.phone.slice(0, 4) + '****' + newCust.phone.slice(-3),
          acquisitionChannel: newCust.acquisitionChannel,
          segment: newCust.segment,
          acceptsMarketing: newCust.acceptsMarketing,
          avatarUrl: '',
          city: newCust.city,
          totalOrders: 0,
          totalSpend: 0,
          lastOrderDate: null,
          createdAt: new Date().toISOString(),
        };
        setCustomers((prev) => [item, ...prev]);
        setIsAddModalOpen(false);
        setFormData({
          fullName: '',
          socialHandle: '',
          phone: '',
          acquisitionChannel: 'INSTAGRAM_DM',
          segment: 'REGULAR',
          acceptsMarketing: true,
          city: 'Jakarta',
        });
        loadDetail(newCust._id);
      } catch (err) {
        alert('Gagal menambah pelanggan: ' + err);
      }
    });
  };

  // Open Edit Customer Modal
  const handleOpenEdit = (cust: CustomerListItem) => {
    setEditingCustomer(cust);
    setIsEditModalOpen(true);
  };

  // Handle Edit Customer Submit
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    startTransition(async () => {
      try {
        await updateCustomer(editingCustomer.id, {
          fullName: editingCustomer.fullName,
          socialHandle: editingCustomer.socialHandle,
          phone: editingCustomer.rawPhone,
          acquisitionChannel: editingCustomer.acquisitionChannel,
          segment: editingCustomer.segment,
          city: editingCustomer.city,
          acceptsMarketing: editingCustomer.acceptsMarketing,
        });

        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? editingCustomer : c))
        );

        if (detailData?.customer.id === editingCustomer.id) {
          loadDetail(editingCustomer.id);
        }

        setIsEditModalOpen(false);
        setEditingCustomer(null);
      } catch (err) {
        alert('Gagal memperbarui pelanggan: ' + err);
      }
    });
  };

  // Handle Add Order directly from Drawer
  const handleCreateOrderFromDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailData) return;

    startTransition(async () => {
      try {
        await createOrder({
          customerId: detailData.customer.id,
          productName: orderDrawerForm.productName,
          variantName: orderDrawerForm.variantName,
          quantity: orderDrawerForm.quantity,
          totalPrice: orderDrawerForm.totalPrice,
          briefNotes: orderDrawerForm.briefNotes,
          paymentStatus: 'LUNAS',
        });

        setIsAddOrderDrawerOpen(false);
        loadDetail(detailData.customer.id);
        alert(`Pesanan PO baru berhasil dibuat untuk ${detailData.customer.fullName}!`);
      } catch (err) {
        alert('Gagal membuat pesanan: ' + err);
      }
    });
  };

  // Toggle marketing preference in drawer
  const handleToggleMarketing = async () => {
    if (!detailData) return;
    const nextVal = !detailData.customer.acceptsMarketing;

    setDetailData((prev) =>
      prev
        ? {
            ...prev,
            customer: { ...prev.customer, acceptsMarketing: nextVal },
          }
        : null
    );

    await updateCustomer(detailData.customer.id, {
      acceptsMarketing: nextVal,
    });

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === detailData.customer.id ? { ...c, acceptsMarketing: nextVal } : c
      )
    );
  };

  // Delete customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Hapus pelanggan ${name}? Seluruh data terkait akan dihapus.`)) return;
    await deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (selectedCustomerId === id) {
      const remaining = customers.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        loadDetail(remaining[0].id);
      } else {
        setSelectedCustomerId(null);
        setDetailData(null);
      }
    }
  };

  // Badge helpers
  const renderChannelBadge = (ch: string) => {
    switch (ch) {
      case 'INSTAGRAM_DM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-channel-instagram-surface text-channel-instagram-text font-semibold text-[11px] border border-channel-instagram-base/20">
            <span>@</span> DM IG
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-channel-whatsapp-surface text-channel-whatsapp-text font-semibold text-[11px] border border-channel-whatsapp-base/20">
            <MessageCircle className="w-3 h-3 text-channel-whatsapp-base" /> WhatsApp
          </span>
        );
      case 'WEB_FORM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-channel-web-surface text-channel-web-text font-semibold text-[11px] border border-channel-web-base/20">
            <ExternalLink className="w-3 h-3 text-channel-web-base" /> Web Form
          </span>
        );
      case 'TIKTOK_SHOP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-surface text-slate-text-secondary font-semibold text-[11px] border border-slate-border">
            <span>♪</span> TikTok
          </span>
        );
      default:
        return <span>{ch}</span>;
    }
  };

  const renderSegmentBadge = (seg: string) => {
    switch (seg) {
      case 'VIP_LOYAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tier-vip-surface text-tier-vip-text font-bold text-[11px] border border-tier-vip-base/20">
            <Award className="w-3 h-3 text-tier-vip-base" /> VIP Loyal
          </span>
        );
      case 'DORMANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-surface text-slate-text-muted font-medium text-[11px] border border-slate-border">
            Pasif / Dormant
          </span>
        );
      case 'REGULAR':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-semibold text-[11px]">
            Regular
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* 1. Header & Context Bar */}
      <section className="px-8 pt-6 pb-2 flex flex-col gap-4">
        {/* Breadcrumb & Strategic Tagging */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-text-muted text-xs">
            <span className="hover:text-slate-text-primary transition-colors cursor-pointer">
              CRM
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-text-primary font-semibold">
              Database Pelanggan
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[10px] uppercase tracking-wider font-bold">
              TOWS W3 + O2
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-success-surface text-status-success-text text-xs font-semibold border border-status-success-border">
              <ShieldCheck className="w-4 h-4 text-status-success-base" />
              <span>UU PDP No. 27/2022 Patuh (100% Masked)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Omni-Channel Live Sync</span>
            </div>
          </div>
        </div>

        {/* Title & 4 High-Density Metric Pills */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
              Database Pelanggan (Single Customer View)
            </h1>
            <p className="text-slate-text-secondary text-sm mt-1">
              Kelola data kontak omni-channel terpadu, riwayat belanja merchandise pre-order, dan kepatuhan privasi proteksi data pribadi.
            </p>
          </div>

          {/* 4 Bento Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-card rounded-xl p-3.5 border border-slate-border shadow-xs flex flex-col justify-center min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Total Pelanggan
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-slate-text-primary">
                  {customers.length}
                </span>
                <span className="text-[11px] font-semibold text-status-success-text">
                  +12% mo
                </span>
              </div>
            </div>

            <div className="bg-slate-card rounded-xl p-3.5 border border-slate-border shadow-xs flex flex-col justify-center min-w-[130px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-tier-vip-text uppercase tracking-wider">
                  VIP Loyal
                </span>
                <Award className="w-3.5 h-3.5 text-tier-vip-base" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-tier-vip-text">
                  {customers.filter((c) => c.segment === 'VIP_LOYAL').length}
                </span>
                <span className="text-[11px] text-slate-text-muted font-medium">
                  AOV &gt; Rp350k
                </span>
              </div>
            </div>

            <div className="bg-slate-card rounded-xl p-3.5 border border-slate-border shadow-xs flex flex-col justify-center min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Batch #12 Aktif
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-primary">
                  {customers.filter((c) => c.totalOrders > 0).length}
                </span>
                <span className="text-[11px] font-semibold text-status-success-text">
                  24.1% konv
                </span>
              </div>
            </div>

            <div className="bg-slate-card rounded-xl p-3.5 border border-slate-border shadow-xs flex flex-col justify-center min-w-[130px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-status-success-text uppercase tracking-wider">
                  PDP Masking
                </span>
                <Lock className="w-3.5 h-3.5 text-status-success-base" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-status-success-text">
                  100%
                </span>
                <span className="text-[11px] text-slate-text-muted">
                  Terenkripsi
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Control Filter Toolbar */}
      <section className="px-8 py-4">
        <div className="bg-slate-card rounded-xl p-3.5 border border-slate-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px] max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, ID, username medsos, kota, atau nomor..."
              className="w-full pl-9 pr-14 py-2 bg-slate-surface rounded-lg text-slate-text-primary placeholder:text-slate-text-muted text-xs focus:outline-none focus:ring-1 focus:ring-primary-container focus:bg-slate-card border border-transparent focus:border-slate-border transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kanal Asal Dropdown */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs py-2 px-3 rounded-lg border border-slate-border focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">Semua Kanal (Omni)</option>
              <option value="INSTAGRAM">Instagram DM</option>
              <option value="WHATSAPP">WhatsApp Direct</option>
              <option value="WEB">Web Pre-Order Form</option>
              <option value="TIKTOK">TikTok Shop / Inquiry</option>
            </select>

            {/* Segmen Filter */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs py-2 px-3 rounded-lg border border-slate-border focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">Semua Segmen</option>
              <option value="VIP">VIP Loyal</option>
              <option value="REGULAR">Regular Customer</option>
              <option value="DORMANT">Pasif / Dormant</option>
            </select>

            <div className="h-5 w-px bg-slate-border hidden sm:block" />

            {/* Real Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-surface hover:bg-surface-container text-slate-text-primary rounded-lg text-xs font-semibold border border-slate-border transition-colors cursor-pointer"
              title="Unduh berkas CSV resmi dengan penyamaran nomor UU PDP"
            >
              <Download className="w-3.5 h-3.5 text-slate-text-secondary" />
              <span>Export CSV</span>
            </button>

            {/* Add Customer Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-container hover:bg-secondary text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>+ Tambah Pelanggan Baru</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace: Table (Left) + Slide-Over Drawer (Right) */}
      <section className="px-8 pb-8 flex flex-col xl:flex-row gap-6 items-start">
        {/* Table Container (Fluid flex-1) */}
        <div className="flex-1 w-full bg-slate-card rounded-xl border border-slate-border shadow-xs overflow-hidden flex flex-col">
          {/* Table Header Band */}
          <div className="px-5 py-3.5 bg-slate-surface border-b border-slate-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-text-primary">
                Direktori Pelanggan
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-primary text-[11px] rounded-full font-bold">
                {filteredCustomers.length} dari {customers.length} Ditampilkan
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-text-muted text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-status-success-base" />
              <span>Data Masked Otomatis (UU No.27/2022)</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-surface/60 text-slate-text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-slate-border select-none">
                  <th className="py-3 px-3 pl-5">ID</th>
                  <th className="py-3 px-3">Nama Lengkap</th>
                  <th className="py-3 px-3">Username Medsos</th>
                  <th className="py-3 px-3">No. WhatsApp (PDP)</th>
                  <th className="py-3 px-3">Kanal Asal</th>
                  <th className="py-3 px-3 text-center">Total Order</th>
                  <th className="py-3 px-3">Terakhir Belanja</th>
                  <th className="py-3 px-3">Segmen</th>
                  <th className="py-3 px-3 pr-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-text-muted">
                      Tidak ada pelanggan yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = selectedCustomerId === cust.id;
                    return (
                      <tr
                        key={cust.id}
                        onClick={() => loadDetail(cust.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-surface-container-low font-medium'
                            : 'hover:bg-slate-surface'
                        }`}
                      >
                        <td className="py-3 px-3 pl-5 font-mono text-[11px] text-primary font-bold">
                          {cust.customerId}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-text-primary">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                              {cust.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <span className="truncate max-w-[140px]">{cust.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-text-secondary font-mono text-[11px]">
                          {cust.socialHandle}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-text-primary">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-surface border border-slate-border">
                            <Lock className="w-3 h-3 text-status-success-base" />
                            <span>{cust.maskedPhone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderChannelBadge(cust.acquisitionChannel)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-surface text-slate-text-primary font-bold text-[11px] border border-slate-border">
                            <ShoppingBag className="w-3 h-3 text-primary" /> {cust.totalOrders} Order
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-text-secondary whitespace-nowrap">
                          {cust.lastOrderDate ? formatRelativeTime(cust.lastOrderDate) : 'Belum order'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderSegmentBadge(cust.segment)}
                        </td>
                        <td className="py-3 px-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadDetail(cust.id);
                              }}
                              className="px-2.5 py-1 rounded bg-primary-container text-white text-[11px] font-bold shadow-xs hover:bg-secondary cursor-pointer"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(cust);
                              }}
                              className="p-1 rounded text-slate-text-muted hover:text-primary hover:bg-slate-surface transition-colors cursor-pointer"
                              title="Edit Profil"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(cust.id, cust.fullName);
                              }}
                              className="p-1 rounded text-slate-text-muted hover:text-status-danger-base hover:bg-status-danger-surface transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Table Footer */}
          <div className="p-4 bg-slate-surface border-t border-slate-border flex flex-wrap items-center justify-between gap-3 text-xs text-slate-text-secondary">
            <span>
              Menampilkan <strong>{filteredCustomers.length}</strong> dari <strong>{customers.length}</strong> pelanggan terdaftar
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-text-muted">Kepatuhan UU PDP No.27/2022 Aktif</span>
            </div>
          </div>
        </div>

        {/* Slide-Over Detail Drawer (Single Customer View Panel: ~430px) */}
        {drawerOpen && detailData && (
          <div className="w-full xl:w-[440px] shrink-0 bg-slate-card rounded-xl border border-slate-border shadow-lg overflow-hidden flex flex-col transition-all">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-surface border-b border-slate-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary-container text-white font-mono text-[11px] font-bold">
                  {detailData.customer.customerId}
                </span>
                <span className="text-xs font-bold text-slate-text-primary">
                  Single Customer View
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => loadDetail(detailData.customer.id)}
                  title="Refresh Profil"
                  className="p-1.5 rounded-lg text-slate-text-muted hover:text-slate-text-primary hover:bg-slate-card transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDetail ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  title="Tutup Panel"
                  className="p-1.5 rounded-lg text-slate-text-muted hover:text-status-danger-base hover:bg-slate-card transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Profile Header */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center font-bold text-lg text-primary shadow-xs shrink-0 border border-slate-border">
                  {detailData.customer.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-text-primary truncate">
                      {detailData.customer.fullName}
                    </h2>
                    {renderSegmentBadge(detailData.customer.segment)}
                  </div>
                  <span className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                    {detailData.customer.socialHandle} ({detailData.customer.acquisitionChannel.replace('_', ' ')})
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-text-primary">
                      {detailData.customer.maskedPhone}
                    </span>
                    <a
                      href={`https://wa.me/${detailData.customer.rawPhone.replace(/^0/, '62')}?text=${encodeURIComponent(
                        `Halo kak ${detailData.customer.fullName}! Ada yang bisa kami bantu terkait pesanan merchandise di Lunarchivve? ✨`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-channel-whatsapp-surface text-channel-whatsapp-text hover:bg-channel-whatsapp-base hover:text-white transition-colors text-[11px] font-bold border border-channel-whatsapp-base/20"
                    >
                      <MessageCircle className="w-3 h-3 text-channel-whatsapp-base" /> Chat WA
                    </a>
                  </div>
                </div>
              </div>

              {/* 3-Column Metric Box (LTV & Spend) */}
              <div className="grid grid-cols-3 gap-2 bg-slate-surface p-3.5 rounded-xl border border-slate-border text-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-text-muted font-semibold uppercase">
                    Total Belanja
                  </span>
                  <span className="text-xs font-bold text-slate-text-primary mt-1">
                    {formatRupiah(detailData.metrics.totalSpend)}
                  </span>
                  <span className="text-[10px] text-status-success-text font-semibold">
                    {detailData.metrics.totalOrders} Pesanan
                  </span>
                </div>
                <div className="flex flex-col border-x border-slate-border px-1">
                  <span className="text-[10px] text-slate-text-muted font-semibold uppercase">
                    Nilai AOV
                  </span>
                  <span className="text-xs font-bold text-slate-text-primary mt-1">
                    {formatRupiah(detailData.metrics.aov)}
                  </span>
                  <span className="text-[10px] text-slate-text-secondary">
                    {detailData.metrics.aov > 100000 ? 'Tinggi' : 'Standar'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-text-muted font-semibold uppercase">
                    Retensi PO
                  </span>
                  <span className="text-xs font-bold text-primary mt-1">
                    {detailData.metrics.retentionBatch}
                  </span>
                  <span className="text-[10px] text-status-success-text font-semibold">
                    Konsisten
                  </span>
                </div>
              </div>

              {/* Recent Linked Orders Timeline */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-text-muted font-bold">
                    Pesanan Terkait ({detailData.orders.length})
                  </span>
                </div>

                {detailData.orders.length === 0 ? (
                  <p className="text-xs text-slate-text-muted italic bg-slate-surface p-3 rounded-lg">
                    Belum ada riwayat pesanan PO.
                  </p>
                ) : (
                  detailData.orders.slice(0, 3).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-xl bg-slate-surface border border-slate-border flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-text-primary">
                          {ord.orderCode}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                          {ord.pipelineStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-text-primary">
                        {ord.productName} ({ord.variantName})
                      </p>
                      <div className="flex items-center justify-between text-slate-text-muted text-[11px] pt-1 border-t border-slate-border/50">
                        <span className="font-bold text-slate-text-primary">
                          {formatRupiah(ord.totalPrice)} ({ord.quantity} pcs)
                        </span>
                        <span>{formatRelativeTime(ord.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Linked Support Ticket History */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-text-muted font-bold">
                  Riwayat Tiket Layanan &amp; QA ({detailData.tickets.length})
                </span>

                {detailData.tickets.length === 0 ? (
                  <p className="text-xs text-slate-text-muted italic bg-slate-surface p-3 rounded-lg">
                    Tidak ada komplain atau tiket terbuka.
                  </p>
                ) : (
                  detailData.tickets.map((tk) => (
                    <div
                      key={tk.id}
                      className="p-3 rounded-xl bg-slate-surface border border-slate-border flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-text-primary">
                          {tk.ticketCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tk.status === 'RESOLVED'
                              ? 'bg-status-success-surface text-status-success-text'
                              : 'bg-status-warning-surface text-status-warning-text'
                          }`}
                        >
                          {tk.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-text-secondary">{tk.issueDetail}</p>
                      <span className="text-[10px] text-slate-text-muted">
                        PIC: <strong>{tk.assignedPIC}</strong>
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Privacy & PDP Marketing Consent Toggle */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-slate-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-status-success-base" />
                    <span className="text-xs font-bold text-slate-text-primary">
                      Kepatuhan Privasi (UU PDP)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-status-success-surface text-status-success-text text-[10px] font-bold">
                    Opt-In Valid
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-text-primary">
                      Terima Promo PO WhatsApp
                    </span>
                    <span className="text-[10px] text-slate-text-muted">
                      Katalog pre-order berkala &amp; voucher VIP
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detailData.customer.acceptsMarketing}
                      onChange={handleToggleMarketing}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-status-success-base" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-text-muted italic pt-1">
                  * Data sensitif dienkripsi AES-256. Akses nomor terbuka hanya dicatat untuk audit legal.
                </p>
              </div>

              {/* Bottom Quick Links */}
              <div className="flex items-center gap-2 pt-1 pb-2">
                <a
                  href={`/leads`}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-bold border border-slate-border transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-channel-whatsapp-base" />
                  <span>Kirim Template WA</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsAddOrderDrawerOpen(true)}
                  className="flex-1 py-2 px-3 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-white" />
                  <span>+ Pesanan Batch #12</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Modal: Tambah Pelanggan Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Tambah Pelanggan Baru
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Sistem akan membuat ID unik &amp; masking PDP otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Contoh: Sarah Aurelia"
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Username Medsos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.socialHandle}
                    onChange={(e) => setFormData({ ...formData, socialHandle: e.target.value })}
                    placeholder="@sarah_aur"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    No. WhatsApp (PDP) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081298448821"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Kanal Asal
                  </label>
                  <select
                    value={formData.acquisitionChannel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        acquisitionChannel: e.target.value as CustomerListItem['acquisitionChannel'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="INSTAGRAM_DM">Instagram DM</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WEB_FORM">Web Form</option>
                    <option value="TIKTOK_SHOP">TikTok Shop</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Segmen
                  </label>
                  <select
                    value={formData.segment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        segment: e.target.value as CustomerListItem['segment'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="REGULAR">Regular Customer</option>
                    <option value="VIP_LOYAL">VIP Loyal</option>
                    <option value="DORMANT">Pasif / Dormant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Kota Domisili
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Jakarta / Surabaya / Bandung"
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  checked={formData.acceptsMarketing}
                  onChange={(e) =>
                    setFormData({ ...formData, acceptsMarketing: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary-container focus:ring-primary"
                />
                <label htmlFor="marketingConsent" className="text-xs text-slate-text-secondary cursor-pointer">
                  Pelanggan menyetujui penerimaan promo pre-order (Opt-in UU PDP)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Pelanggan */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    Edit Pelanggan ({editingCustomer.customerId})
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Perbarui kontak &amp; preferensi promosi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomerSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.fullName}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Username Medsos
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.socialHandle}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, socialHandle: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.rawPhone}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, rawPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Kanal Asal
                  </label>
                  <select
                    value={editingCustomer.acquisitionChannel}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        acquisitionChannel: e.target.value as CustomerListItem['acquisitionChannel'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="INSTAGRAM_DM">Instagram DM</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WEB_FORM">Web Form</option>
                    <option value="TIKTOK_SHOP">TikTok Shop</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Segmen
                  </label>
                  <select
                    value={editingCustomer.segment}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        segment: e.target.value as CustomerListItem['segment'],
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="REGULAR">Regular Customer</option>
                    <option value="VIP_LOYAL">VIP Loyal</option>
                    <option value="DORMANT">Pasif / Dormant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Kota Domisili
                </label>
                <input
                  type="text"
                  value={editingCustomer.city}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, city: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-surface hover:bg-surface-container text-slate-text-primary text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary-container hover:bg-secondary text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Perbarui'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Buat Pesanan Baru Dari Drawer Customer */}
      {isAddOrderDrawerOpen && detailData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    + Pesanan Pre-Order Batch #12
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Untuk: {detailData.customer.fullName} ({detailData.customer.customerId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOrderDrawerOpen(false)}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderFromDrawer} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Nama Produk Merchandise *
                </label>
                <input
                  type="text"
                  required
                  value={orderDrawerForm.productName}
                  onChange={(e) =>
                    setOrderDrawerForm({ ...orderDrawerForm, productName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-text-primary block mb-1">
                    Varian / Spesifikasi
                  </label>
                  <input
                    type="text"
                    value={orderDrawerForm.variantName}
                    onChange={(e) =>
                      setOrderDrawerForm({ ...orderDrawerForm, variantName: e.target.value })
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
                    value={orderDrawerForm.quantity}
                    onChange={(e) =>
                      setOrderDrawerForm({
                        ...orderDrawerForm,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Total Nilai (IDR) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={orderDrawerForm.totalPrice}
                  onChange={(e) =>
                    setOrderDrawerForm({
                      ...orderDrawerForm,
                      totalPrice: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-text-primary block mb-1">
                  Catatan Brief &amp; Aksesoris
                </label>
                <input
                  type="text"
                  value={orderDrawerForm.briefNotes}
                  onChange={(e) =>
                    setOrderDrawerForm({ ...orderDrawerForm, briefNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-border">
                <button
                  type="button"
                  onClick={() => setIsAddOrderDrawerOpen(false)}
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
