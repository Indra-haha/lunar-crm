import React, { Suspense } from 'react';
import { connection } from 'next/server';
import DashboardClient from './DashboardClient';
import { getAnalyticsDashboardData } from '@/app/actions/analytics';

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const data = await getAnalyticsDashboardData();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat metrik dashboard...</div>}>
      <DashboardClient initialData={data} />
    </Suspense>
  );
}
