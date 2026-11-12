import React, { Suspense } from 'react';
import { connection } from 'next/server';
import LeadsClient from './LeadsClient';
import { GET } from '@/app/api/leads/route';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  await connection();
  const res = await GET();
  const { leads, templates, messageLogs } = await res.json();

  return (
    <Suspense fallback={<div className="p-8 text-slate-text-muted">Memuat antrean leads...</div>}>
      <LeadsClient
        initialLeads={leads}
        initialTemplates={templates}
        initialLogs={messageLogs}
      />
    </Suspense>
  );
}
