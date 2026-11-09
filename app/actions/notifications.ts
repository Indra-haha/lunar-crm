'use server';

import { connectToDatabase, db } from '@/lib/db';
import { orders, leads, supportTickets } from '@/lib/schema';
import { eq, ne, lt, and } from 'drizzle-orm';

export interface SystemNotification {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  desc: string;
  href: string;
  createdAt: string;
}

export async function getSystemNotifications(): Promise<SystemNotification[]> {
  await connectToDatabase();

  const notifications: SystemNotification[] = [];
  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const threeDaysAgo = new Date(now - THREE_DAYS_MS);
  const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);

  // 1. Overdue Orders
  const overdueOrders = await db
    .select()
    .from(orders)
    .where(and(ne(orders.pipelineStatus, 'SELESAI'), lt(orders.enteredStageAt, threeDaysAgo)))
    .limit(3);

  for (const o of overdueOrders) {
    notifications.push({
      id: `ord-${o.id}`,
      type: 'danger',
      title: 'Bottleneck Vendor > 3 Hari',
      desc: `${o.orderCode} (${o.productName}) tertahan di ${o.pipelineStatus.replace('_', ' ')}.`,
      href: '/pipeline',
      createdAt: o.enteredStageAt ? o.enteredStageAt.toISOString() : new Date().toISOString(),
    });
  }

  // 2. Urgent Unanswered Leads
  const urgentLeads = await db
    .select()
    .from(leads)
    .where(and(eq(leads.status, 'NEW'), lt(leads.inboundAt, fifteenMinutesAgo)))
    .limit(3);

  for (const l of urgentLeads) {
    const elapsedMinutes = Math.round((now - new Date(l.inboundAt).getTime()) / (60 * 1000));
    notifications.push({
      id: `lead-${l.id}`,
      type: 'warning',
      title: 'Lead Kritis Menunggu Respon',
      desc: `${l.prospectName} (${l.socialHandle}) belum direspon selama ${elapsedMinutes} menit.`,
      href: '/leads',
      createdAt: l.inboundAt.toISOString(),
    });
  }

  // 3. Open Support Tickets
  const openTickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.status, 'OPEN'))
    .limit(3);

  for (const t of openTickets) {
    notifications.push({
      id: `ticket-${t.id}`,
      type: 'info',
      title: 'Tiket Komplain Baru Terbuka',
      desc: `${t.ticketCode}: ${t.issueDetail.slice(0, 50)}...`,
      href: '/support',
      createdAt: t.createdAt.toISOString(),
    });
  }

  return notifications;
}
