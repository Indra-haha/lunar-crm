import React, { Suspense } from 'react';
import { connection } from 'next/server';
import LeadsClient from './LeadsClient';
import { getLeads, getTemplates } from '@/app/actions/leads';
import { getMessageAuditLogs } from '@/app/actions/messages';

export const instant = false;

export default async function LeadsPage() {
  await connection();
  const [leads, templates, messageLogs] = await Promise.all([
    getLeads(),
    getTemplates(),
    getMessageAuditLogs(),
  ]);

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
