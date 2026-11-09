import React, { Suspense } from 'react';
import { connection } from 'next/server';
import CustomersClient from './CustomersClient';
import { getCustomers } from '@/app/actions/customers';

export const instant = false;

export default async function CustomersPage() {
  await connection();
  const initialCustomers = await getCustomers();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat data pelanggan...</div>}>
      <CustomersClient initialCustomers={initialCustomers} />
    </Suspense>
  );
}
