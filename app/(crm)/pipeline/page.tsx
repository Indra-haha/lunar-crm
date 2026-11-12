import React, { Suspense } from 'react';
import { connection } from 'next/server';
import PipelineClient from './PipelineClient';
import { GET as getOrdersRoute } from '@/app/api/orders/route';
import { GET as getCustomersRoute } from '@/app/api/customers/route';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  await connection();
  const [ordersRes, customersRes] = await Promise.all([
    getOrdersRoute(),
    getCustomersRoute(),
  ]);

  const boardData = await ordersRes.json();
  const customers = await customersRes.json();

  const customerOptions = (Array.isArray(customers) ? customers : []).map((c: { id: string; fullName: string; customerId: string }) => ({
    id: c.id,
    fullName: c.fullName,
    customerId: c.customerId,
  }));

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat pipeline order...</div>}>
      <PipelineClient initialBoard={boardData} customersList={customerOptions} />
    </Suspense>
  );
}
