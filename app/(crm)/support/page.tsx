import React, { Suspense } from 'react';
import { connection } from 'next/server';
import SupportClient from './SupportClient';
import { getTickets, getQAWorkbenchData } from '@/app/actions/support';

export const instant = false;

export default async function SupportPage() {
  await connection();
  const [tickets, qaOrders] = await Promise.all([
    getTickets(),
    getQAWorkbenchData(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat data QC & tiket...</div>}>
      <SupportClient initialTickets={tickets} qaOrders={qaOrders} />
    </Suspense>
  );
}
