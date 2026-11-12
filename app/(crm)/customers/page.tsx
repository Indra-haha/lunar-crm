import React, { Suspense } from 'react';
import { connection } from 'next/server';
import CustomersClient from './CustomersClient';
import { GET } from '@/app/api/customers/route';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  await connection();
  const res = await GET();
  const initialCustomers = await res.json();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat data pelanggan...</div>}>
      <CustomersClient initialCustomers={initialCustomers} />
    </Suspense>
  );
}
