import { NextResponse } from 'next/server';
import { connectToDatabase, db } from '@/lib/db';
import { orders, supportTickets, leads } from '@/lib/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const notifications: Array<{
      id: string;
      title: string;
      desc: string;
      time: string;
      type: 'danger' | 'warning' | 'info';
      href: string;
    }> = [];

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    const [overdueOrders, openTickets, pendingLeads] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(eq(orders.pipelineStatus, 'PRODUKSI_VENDOR'))
        .orderBy(desc(orders.createdAt)),
      db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.status, 'OPEN'))
        .orderBy(desc(supportTickets.createdAt))
        .limit(3),
      db
        .select()
        .from(leads)
        .where(and(eq(leads.status, 'NEW'), isNull(leads.firstResponseAt)))
        .orderBy(desc(leads.createdAt))
        .limit(3),
    ]);

    for (const o of overdueOrders) {
      const entered = o.enteredStageAt ? new Date(o.enteredStageAt).getTime() : new Date(o.createdAt).getTime();
      if (now - entered > THREE_DAYS_MS) {
        notifications.push({
          id: `sla-${o.id}`,
          title: `Overdue SLA Vendor: ${o.orderCode}`,
          desc: `Pesanan "${o.productName}" tertahan >3 hari di pabrikasi. Segera eskalasi ke vendor.`,
          time: 'Kritis',
          type: 'danger',
          href: '/pipeline',
        });
      }
    }

    for (const t of openTickets) {
      notifications.push({
        id: `ticket-${t.id}`,
        title: `Komplain Masuk: ${t.ticketCode}`,
        desc: `${t.category}: ${t.issueDetail.slice(0, 75)}...`,
        time: 'Baru',
        type: t.category === 'CATEGORY_A' ? 'danger' : 'warning',
        href: '/support',
      });
    }

    for (const l of pendingLeads) {
      notifications.push({
        id: `lead-${l.id}`,
        title: `Lead Belum Dibalas: ${l.prospectName}`,
        desc: `Pesan masuk ${l.inboundChannel}: "${l.messagePreview.slice(0, 60)}..."`,
        time: '<15m SLA',
        type: 'warning',
        href: '/leads',
      });
    }

    return NextResponse.json(notifications);
  } catch (err) {
    console.error('API GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Gagal memuat notifikasi', details: String(err) }, { status: 500 });
  }
}
