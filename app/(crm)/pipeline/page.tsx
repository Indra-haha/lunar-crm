import React, { Suspense } from 'react';
import { connection } from 'next/server';
import PipelineClient from './PipelineClient';
import { getOrdersByStage } from '@/app/actions/orders';
import { getCustomers } from '@/app/actions/customers';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  await connection();
  const [boardData, customers] = await Promise.all([
    getOrdersByStage(),
    getCustomers(),
  ]);

  const customerOptions = customers.map((c) => ({
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
