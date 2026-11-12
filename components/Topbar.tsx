'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  X,
  Users,
  ShoppingBag,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GlobalSearchResult } from '@/app/actions/globalSearch';
import type { SystemNotification } from '@/app/actions/notifications';
import type { SessionPayload } from '@/lib/auth';
import { formatRupiah } from '@/lib/formatters';

export default function Topbar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // User Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<SessionPayload | null>(null);

  const [, startTransition] = useTransition();

  // Load real notifications & current logged in admin on mount
  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => console.error(err));

    fetch('/api/auth')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.admin) setAdminUser(data.admin);
      })
      .catch((err) => console.error(err));
  }, []);

  // Listen to Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced Search Handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalResults = searchResults
    ? searchResults.customers.length +
      searchResults.orders.length +
      searchResults.tickets.length +
      searchResults.leads.length
    : 0;

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-slate-card border-b border-slate-border z-30 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
      <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
        {/* Global Live Search Bar */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-text-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Cari pelanggan, pesanan, atau tiket komplain..."
              className="w-full pl-10 pr-16 py-2 bg-slate-surface border border-slate-border rounded-lg text-slate-text-primary placeholder:text-slate-text-muted text-xs focus:outline-none focus:border-primary-container focus:bg-slate-card transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-3 text-slate-text-muted hover:text-slate-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-3 px-1.5 py-0.5 bg-slate-card border border-slate-border rounded text-[10px] text-slate-text-muted font-mono select-none pointer-events-none">
                ⌘K
              </div>
            )}
          </div>

          {/* Live Global Search Results Popover Dropdown */}
          {isSearchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-card border border-slate-border rounded-xl shadow-2xl p-3 z-50 max-h-[460px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-border mb-2 text-xs">
                <span className="font-bold text-slate-text-primary">
                  Hasil Pencarian Global ({totalResults})
                </span>
                {isSearching ? (
                  <span className="text-[11px] text-primary animate-pulse font-medium">
                    Mencari di database...
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-text-muted">Tekan Esc untuk tutup</span>
                )}
              </div>

              {totalResults === 0 && !isSearching ? (
                <div className="py-6 text-center text-xs text-slate-text-muted">
                  Tidak ada data yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Category: Pelanggan */}
                  {searchResults && searchResults.customers.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-text-muted px-2">
                        Pelanggan ({searchResults.customers.length})
                      </span>
                      {searchResults.customers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push(`/customers?id=${c.id}`);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-surface flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center font-bold text-[10px] text-primary">
                              <Users className="w-3 h-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-text-primary">
                                {c.fullName}
                              </p>
                              <span className="text-[10px] text-slate-text-muted font-mono">
                                {c.customerId} • {c.socialHandle} • {c.maskedPhone}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-primary font-bold">
                            {c.segment}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category: Pesanan PO */}
                  {searchResults && searchResults.orders.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-text-muted px-2">
                        Pesanan PO ({searchResults.orders.length})
                      </span>
                      {searchResults.orders.map((o) => (
                        <div
                          key={o.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push('/pipeline');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-surface flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-[10px] text-on-primary-fixed">
                              <ShoppingBag className="w-3 h-3" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-text-primary">
                                {o.orderCode} • {o.productName}
                              </p>
                              <span className="text-[10px] text-slate-text-muted">
                                {o.variantName} • {formatRupiah(o.totalPrice)}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-status-success-surface text-status-success-text font-bold">
                            {o.pipelineStatus.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category: Tiket Komplain */}
                  {searchResults && searchResults.tickets.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-text-muted px-2">
                        Tiket Keluhan ({searchResults.tickets.length})
                      </span>
                      {searchResults.tickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push('/support');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-surface flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-status-danger-surface flex items-center justify-center font-bold text-[10px] text-status-danger-text">
                              <AlertCircle className="w-3 h-3 text-status-danger-base" />
                            </div>
                            <div className="max-w-xs truncate">
                              <p className="text-xs font-bold text-slate-text-primary">
                                {t.ticketCode} ({t.category})
                              </p>
                              <span className="text-[10px] text-slate-text-muted truncate">
                                {t.issueDetail}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-surface text-slate-text-primary font-bold border border-slate-border">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category: Prospek Leads */}
                  {searchResults && searchResults.leads.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-text-muted px-2">
                        Prospek Leads ({searchResults.leads.length})
                      </span>
                      {searchResults.leads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            router.push('/leads');
                          }}
                          className="p-2 rounded-lg hover:bg-slate-surface flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-channel-whatsapp-surface flex items-center justify-center font-bold text-[10px] text-channel-whatsapp-text">
                              <MessageSquare className="w-3 h-3" />
                            </div>
                            <div className="max-w-xs truncate">
                              <p className="text-xs font-bold text-slate-text-primary">
                                {l.prospectName} ({l.socialHandle})
                              </p>
                              <span className="text-[10px] text-slate-text-muted truncate">
                                {l.messagePreview}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-primary font-bold">
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Indicators & User Profile */}
        <div className="flex items-center gap-4">
          {/* Active Batch Live Pill */}
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-2 px-3 py-1 bg-status-success-surface hover:bg-status-success-border/40 border border-status-success-border rounded-full transition-colors cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success-base opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success-base" />
            </span>
            <span className="text-[11px] font-bold text-status-success-text tracking-wide">
              Batch #12 Open
            </span>
          </Link>

          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 text-slate-text-secondary hover:text-slate-text-primary hover:bg-slate-surface rounded-lg transition-colors cursor-pointer"
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-status-danger-base text-white text-[10px] font-bold rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-card border border-slate-border rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-border mb-2">
                  <span className="text-xs font-bold text-slate-text-primary">
                    Pemberitahuan Sistem ({notifications.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Tandai Semua Dibaca
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-text-muted text-center py-4">
                      Tidak ada pemberitahuan baru.
                    </p>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setNotificationOpen(false)}
                        className={`p-2.5 rounded-lg text-xs flex flex-col gap-0.5 transition-colors ${
                          item.type === 'danger'
                            ? 'bg-status-danger-surface hover:bg-status-danger-border/40 text-status-danger-text'
                            : item.type === 'warning'
                            ? 'bg-status-warning-surface hover:bg-status-warning-border/40 text-status-warning-text'
                            : 'bg-surface-container-low hover:bg-surface-container text-slate-text-primary'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1">
                            {item.type === 'danger' && <ShieldAlert className="w-3.5 h-3.5" />}
                            {item.title}
                          </span>
                          <ArrowRight className="w-3 h-3 opacity-60" />
                        </div>
                        <span className="text-[11px] opacity-80 leading-snug">{item.desc}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-border" />

          {/* User Profile */}
          <div className="relative">
            <div
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
              className="flex items-center gap-3 py-1 px-1.5 rounded-lg hover:bg-slate-surface transition-colors cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container border border-slate-border relative">
                <Image
                  src={
                    adminUser?.avatarUrl ||
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={adminUser?.fullName || 'Nadia Putri'}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-text-primary leading-tight">
                  {adminUser?.fullName || 'Nadia Putri'}
                </span>
                <span className="text-[11px] text-slate-text-muted">
                  {adminUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Studio PIC'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-text-muted" />
            </div>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-card border border-slate-border rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2">
                <div className="pb-2 border-b border-slate-border">
                  <p className="text-xs font-bold text-slate-text-primary">
                    {adminUser?.fullName || 'Nadia Putri, S.Ds.'}
                  </p>
                  <p className="text-[11px] text-slate-text-muted">
                    {adminUser?.email || 'admin@lunarchivve.com'}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-surface-container text-primary text-[10px] font-bold">
                    {adminUser?.role === 'SUPER_ADMIN'
                      ? 'Super Admin • Studio Lead'
                      : 'Studio PIC • Production'}
                  </span>
                </div>
                <div className="text-[11px] flex flex-col gap-1 text-slate-text-secondary">
                  <Link
                    href="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="p-1.5 rounded hover:bg-slate-surface flex items-center justify-between"
                  >
                    <span>Dashboard Metrik</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setProfileOpen(false)}
                    className="p-1.5 rounded hover:bg-slate-surface flex items-center justify-between"
                  >
                    <span>QC &amp; Log Tiket</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="pt-2 border-t border-slate-border">
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      try {
                        await fetch('/api/auth', { method: 'DELETE' });
                      } catch (e) {
                        console.error(e);
                      }
                      window.location.href = '/login';
                    }}
                    className="w-full p-2 rounded-lg hover:bg-rose-50 text-status-danger-text flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Keluar dari Sesi</span>
                    </div>
                    <span className="text-[10px] text-rose-500 font-mono">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
