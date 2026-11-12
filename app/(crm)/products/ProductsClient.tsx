'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Building2,
  Tag,
  X,
  Check,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import Image from 'next/image';
import type { ProductItem } from '@/app/actions/products';
import { formatRupiah } from '@/lib/formatters';

interface ProductsClientProps {
  initialProducts: ProductItem[];
}

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'AKRILIK' as 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA',
    basePrice: 50000,
    vendorName: 'Maklon Akrilik Subur',
    batchAvailable: 'Batch #12 Open',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80',
    description: '',
    variants: [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'AKRILIK',
      basePrice: 50000,
      vendorName: 'Maklon Akrilik Subur',
      batchAvailable: 'Batch #12 Open',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80',
      description: '',
      variants: [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }],
    });
    setEditingProduct(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const [isPending, startTransition] = useTransition();

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      basePrice: p.basePrice,
      vendorName: p.vendorName,
      batchAvailable: p.batchAvailable,
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      variants: p.variants && p.variants.length > 0 ? p.variants : [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }],
    });
    setIsModalOpen(true);
  };

  // Add / Remove Variant Row
  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { name: '', additionalPrice: 0, stockOrQuota: 100 }],
    });
  };

  const handleRemoveVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    });
  };

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    const newVariants = [...formData.variants];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newVariants[index] as any)[field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  // Form Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    startTransition(async () => {
      try {
        if (editingProduct) {
          const response = await fetch(`/api/products/${editingProduct.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const res = await response.json();
          if (!response.ok || !res.success) {
            throw new Error(res.error || 'Gagal memperbarui produk.');
          }
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    ...formData,
                  }
                : p
            )
          );
          setNotification({ type: 'success', text: `Produk ${formData.name} berhasil diperbarui.` });
        } else {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const res = await response.json();
          if (response.ok && res.success && res.product) {
            const newCreated: ProductItem = {
              id: res.product.id,
              productCode: res.product.productCode,
              name: res.product.name,
              category: formData.category,
              basePrice: formData.basePrice,
              vendorName: formData.vendorName,
              variants: formData.variants,
              batchAvailable: formData.batchAvailable,
              isActive: true,
              imageUrl: formData.imageUrl,
              description: formData.description,
              createdAt: new Date().toISOString(),
            };
            setProducts([newCreated, ...products]);
            setNotification({ type: 'success', text: `Produk baru ${formData.name} (${res.product.productCode}) berhasil ditambahkan.` });
          } else {
            throw new Error(res.error || 'Gagal menambahkan produk baru.');
          }
        }
        // Reset form & turn modal off
        resetForm();
        setIsModalOpen(false);

        // Arahkan ke /products
        router.push('/products');
        router.refresh();
      } catch (err) {
        console.error(err);
        const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan produk. Coba lagi.';
        setNotification({ type: 'error', text: errMsg });
      }
    });
  };

  // Delete Product Handler
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}" dari katalog master?`)) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const res = await response.json();
        if (!response.ok || !res.success) {
          throw new Error(res.error || 'Gagal menghapus produk.');
        }
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setNotification({ type: 'success', text: `Produk "${name}" berhasil dihapus.` });
      } catch (err) {
        console.error(err);
        setNotification({ type: 'error', text: 'Gagal menghapus produk.' });
      }
    });
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* 1. Header Context Bar */}
      <section className="px-8 pt-6 pb-4 flex flex-col gap-4">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-text-muted text-xs">
            <Link href="/dashboard" className="hover:text-slate-text-primary transition-colors cursor-pointer">
              CRM
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-text-primary font-semibold">
              Master Produk &amp; Varian Merchandise
            </span>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[10px] uppercase tracking-wider font-bold">
              Reliability (Pencegah Salah Varian)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pesan"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-card hover:bg-slate-surface text-slate-text-primary rounded-lg text-xs font-semibold border border-slate-border shadow-xs transition-all cursor-pointer"
              title="Buka form pemesanan merchandise publik di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-text-secondary" />
              <span>Form Pemesanan (/pesan)</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-secondary text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="max-w-3xl">
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-bold text-slate-text-primary tracking-tight">
            Master Produk &amp; Varian Studio
          </h1>
          <p className="text-slate-text-secondary text-sm mt-1">
            Katalog master spesifikasi merchandise, varian akrilik/photocard/apparel, acuan harga pokok, dan penetapan vendor maklon resmi.
          </p>
        </div>

        {/* Notification Alert Banner */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
              notification.type === 'success'
                ? 'bg-status-success-surface border-status-success-border text-status-success-text'
                : 'bg-status-danger-surface border-status-danger-border text-status-danger-text'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-status-success-base" />
              ) : (
                <AlertCircle className="w-4 h-4 text-status-danger-base" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Total Master Produk
              </span>
              <div className="text-2xl font-bold text-slate-text-primary mt-1">
                {products.length} <span className="text-xs text-slate-text-secondary font-medium">SKU</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Varian Terdaftar
              </span>
              <div className="text-2xl font-bold text-slate-text-primary mt-1">
                {products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)}{' '}
                <span className="text-xs text-slate-text-secondary font-medium">Opsi</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-status-success-surface text-status-success-base flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Vendor Mitra Maklon
              </span>
              <div className="text-2xl font-bold text-slate-text-primary mt-1">
                {new Set(products.map((p) => p.vendorName)).size}{' '}
                <span className="text-xs text-slate-text-secondary font-medium">Vendor</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-text-muted uppercase tracking-wider">
                Batch Aktif Produksi
              </span>
              <div className="text-lg font-bold text-status-success-text mt-1">
                Batch #12 Open
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-status-warning-surface text-status-warning-base flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filter & Search Bar */}
      <section className="px-8 py-3">
        <div className="bg-slate-card p-4 rounded-xl border border-slate-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama merchandise, kode produk, atau vendor..."
              className="w-full pl-10 pr-4 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs text-slate-text-primary placeholder:text-slate-text-muted focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'AKRILIK', 'PHOTOCARD', 'STATIONERY', 'APPAREL'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-primary-container text-white shadow-xs'
                    : 'bg-slate-surface text-slate-text-secondary hover:text-slate-text-primary'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Product Catalog Grid */}
      <section className="px-8 py-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-slate-card rounded-2xl border border-slate-border p-12 text-center">
            <Package className="w-12 h-12 text-slate-text-muted mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-text-primary">Tidak Ada Produk yang Cocok</h3>
            <p className="text-xs text-slate-text-muted mt-1">
              Ubah filter pencarian atau tambahkan produk baru ke dalam katalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-card rounded-2xl border border-slate-border shadow-xs overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={
                        prod.imageUrl ||
                        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80'
                      }
                      alt={prod.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs text-white font-mono text-[11px] font-bold">
                        {prod.productCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-bold text-[10px]">
                        {prod.category}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/90 text-white font-bold text-[10px] shadow-xs">
                        {prod.batchAvailable}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5">
                    <h3 className="text-sm font-bold text-slate-text-primary group-hover:text-primary transition-colors">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-text-secondary line-clamp-2 mt-1">
                      {prod.description || 'Spesifikasi merchandise kustom studio pre-order.'}
                    </p>

                    {/* Price & Vendor */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-border text-xs">
                      <div>
                        <span className="text-[10px] text-slate-text-muted uppercase font-semibold block">
                          Harga Acuan PO:
                        </span>
                        <span className="text-base font-bold text-slate-text-primary">
                          {formatRupiah(prod.basePrice)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-text-muted uppercase font-semibold block">
                          Mitra Maklon:
                        </span>
                        <span className="text-xs font-semibold text-slate-text-secondary flex items-center gap-1 justify-end">
                          <Building2 className="w-3.5 h-3.5 text-slate-text-muted" />
                          <span>{prod.vendorName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Registered Variants List */}
                    <div className="mt-4 pt-3 border-t border-slate-border">
                      <div className="flex items-center justify-between text-[11px] text-slate-text-muted font-bold mb-2">
                        <span>Pilihan Varian ({prod.variants?.length || 0}):</span>
                        <span>Kuota / Batch</span>
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {prod.variants?.map((v, i) => (
                          <div
                            key={i}
                            className="p-1.5 rounded-lg bg-slate-surface text-[11px] flex items-center justify-between border border-slate-border"
                          >
                            <span className="font-medium text-slate-text-primary truncate max-w-[160px]">
                              {v.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {v.additionalPrice > 0 && (
                                <span className="text-[10px] font-bold text-primary">
                                  +{formatRupiah(v.additionalPrice)}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-text-muted font-mono">
                                {v.stockOrQuota} pcs
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 border-t border-slate-border bg-slate-surface flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prod)}
                    className="p-1.5 rounded-lg border border-slate-border text-slate-text-secondary hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(prod.id, prod.name)}
                    className="p-1.5 rounded-lg border border-slate-border text-slate-text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. MODAL: Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-card rounded-2xl border border-slate-border shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-border flex items-center justify-between bg-slate-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-text-primary">
                    {editingProduct ? `Edit Master Produk: ${editingProduct.productCode}` : 'Tambah Master Produk Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-text-muted">
                    Acuan tunggal katalog merchandise untuk modul pesanan &amp; form pemesanan publik.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-text-muted hover:text-slate-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form action="/products" method="post" onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Nama Merchandise <span className="text-status-danger-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Acrylic Standee 15cm Custom"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Kategori Merchandise
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs font-semibold focus:outline-none focus:border-primary-container"
                  >
                    <option value="AKRILIK">AKRILIK</option>
                    <option value="PHOTOCARD">PHOTOCARD</option>
                    <option value="STATIONERY">STATIONERY</option>
                    <option value="APPAREL">APPAREL</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Harga Acuan Dasar (IDR) <span className="text-status-danger-base">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Nama Vendor Maklon <span className="text-status-danger-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    placeholder="Contoh: Maklon Akrilik Subur"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Status Ketersediaan Batch
                  </label>
                  <input
                    type="text"
                    value={formData.batchAvailable}
                    onChange={(e) => setFormData({ ...formData, batchAvailable: e.target.value })}
                    placeholder="Contoh: Batch #12 Open"
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                    Tautan Gambar Preview (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-text-primary mb-1">
                  Deskripsi / Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan bahan, standar ketebalan, dan kemasan..."
                  className="w-full p-2.5 bg-slate-surface border border-slate-border rounded-lg text-xs focus:outline-none focus:border-primary-container"
                />
              </div>

              {/* Varian Editor */}
              <div className="pt-2 border-t border-slate-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-text-primary text-xs">
                    Daftar Varian Spesifikasi ({formData.variants.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-2.5 py-1 rounded bg-surface-container text-primary font-bold text-[11px] hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Varian</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.variants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-surface rounded-xl border border-slate-border grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          value={variant.name}
                          onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                          placeholder="Nama Varian (misal: 2 Sisi Glossy 4mm)"
                          className="w-full px-2.5 py-1.5 bg-slate-card border border-slate-border rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={variant.additionalPrice}
                          onChange={(e) =>
                            handleVariantChange(idx, 'additionalPrice', parseInt(e.target.value, 10) || 0)
                          }
                          placeholder="+ Harga (IDR)"
                          className="w-full px-2.5 py-1.5 bg-slate-card border border-slate-border rounded-lg text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={variant.stockOrQuota}
                          onChange={(e) =>
                            handleVariantChange(idx, 'stockOrQuota', parseInt(e.target.value, 10) || 0)
                          }
                          placeholder="Kuota (pcs)"
                          className="w-full px-2.5 py-1.5 bg-slate-card border border-slate-border rounded-lg text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {formData.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-slate-text-muted hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-border rounded-lg text-slate-text-secondary hover:text-slate-text-primary text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-primary-container hover:bg-secondary text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Perbarui Produk' : 'Simpan Produk Baru'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
