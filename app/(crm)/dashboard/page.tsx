import React, { Suspense } from 'react';
import { connection } from 'next/server';
import DashboardClient from './DashboardClient';
import { GET } from '@/app/api/dashboard/route';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await connection();
  const session = await getSession();
  const res = await GET();
  const data = await res.json();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat metrik dashboard...</div>}>
      <DashboardClient initialData={data} userRole={session?.role} />
    </Suspense>
  );
}
