import React, { Suspense } from 'react';
import { connection } from 'next/server';
import SupportClient from './SupportClient';
import { GET as getSupportRoute } from '@/app/api/support/route';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  await connection();
  const res = await getSupportRoute();
  const { tickets, qaOrders } = await res.json();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat data QC & tiket...</div>}>
      <SupportClient initialTickets={tickets} qaOrders={qaOrders} />
    </Suspense>
  );
}
