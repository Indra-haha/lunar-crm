import { NextResponse } from 'next/server';
import { connectToDatabase, db } from '@/lib/db';
import { customers, orders, supportTickets, leads } from '@/lib/schema';
import { ilike, or, desc } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({
        customers: [],
        orders: [],
        tickets: [],
        leads: [],
      });
    }

    const pattern = `%${query}%`;

    const [matchedCustomers, matchedOrders, matchedTickets, matchedLeads] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.fullName, pattern),
            ilike(customers.customerId, pattern),
            ilike(customers.socialHandle, pattern),
            ilike(customers.phone, pattern)
          )
        )
        .limit(5),

      db
        .select()
        .from(orders)
        .where(
          or(
            ilike(orders.orderCode, pattern),
            ilike(orders.productName, pattern),
            ilike(orders.variantName, pattern)
          )
        )
        .limit(5),

      db
        .select()
        .from(supportTickets)
        .where(
          or(
            ilike(supportTickets.ticketCode, pattern),
            ilike(supportTickets.issueDetail, pattern)
          )
        )
        .limit(5),

      db
        .select()
        .from(leads)
        .where(
          or(
            ilike(leads.prospectName, pattern),
            ilike(leads.socialHandle, pattern),
            ilike(leads.phone, pattern),
            ilike(leads.messagePreview, pattern)
          )
        )
        .limit(5),
    ]);

    return NextResponse.json({
      customers: matchedCustomers.map((c) => ({
        id: c.id,
        customerId: c.customerId,
        fullName: c.fullName,
        socialHandle: c.socialHandle,
        maskedPhone: maskPhone(c.phone),
        segment: c.segment,
      })),
      orders: matchedOrders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        productName: o.productName,
        variantName: o.variantName,
        totalPrice: o.totalPrice,
        pipelineStatus: o.pipelineStatus,
      })),
      tickets: matchedTickets.map((t) => ({
        id: t.id,
        ticketCode: t.ticketCode,
        category: t.category,
        issueDetail: t.issueDetail,
        status: t.status,
      })),
      leads: matchedLeads.map((l) => ({
        id: l.id,
        prospectName: l.prospectName,
        socialHandle: l.socialHandle,
        messagePreview: l.messagePreview,
        status: l.status,
      })),
    });
  } catch (err) {
    console.error('API GET /api/search error:', err);
    return NextResponse.json({ error: 'Gagal mencari data', details: String(err) }, { status: 500 });
  }
}
