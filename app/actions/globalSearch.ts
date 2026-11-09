'use server';

import { connectToDatabase, db } from '@/lib/db';
import { customers, orders, supportTickets, leads } from '@/lib/schema';
import { ilike, or } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export interface GlobalSearchResult {
  customers: Array<{
    id: string;
    customerId: string;
    fullName: string;
    socialHandle: string;
    maskedPhone: string;
    segment: string;
  }>;
  orders: Array<{
    id: string;
    orderCode: string;
    productName: string;
    variantName: string;
    pipelineStatus: string;
    totalPrice: number;
  }>;
  tickets: Array<{
    id: string;
    ticketCode: string;
    category: string;
    issueDetail: string;
    status: string;
  }>;
  leads: Array<{
    id: string;
    prospectName: string;
    socialHandle: string;
    messagePreview: string;
    status: string;
  }>;
}

export async function searchGlobal(query: string): Promise<GlobalSearchResult> {
  if (!query || query.trim().length < 2) {
    return { customers: [], orders: [], tickets: [], leads: [] };
  }

  await connectToDatabase();
  const q = `%${query.trim()}%`;

  const [customerRows, orderRows, ticketRows, leadRows] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.fullName, q),
          ilike(customers.customerId, q),
          ilike(customers.socialHandle, q),
          ilike(customers.phone, q)
        )
      )
      .limit(5),

    db
      .select()
      .from(orders)
      .where(
        or(
          ilike(orders.orderCode, q),
          ilike(orders.productName, q),
          ilike(orders.variantName, q),
          ilike(orders.briefNotes, q)
        )
      )
      .limit(5),

    db
      .select()
      .from(supportTickets)
      .where(
        or(
          ilike(supportTickets.ticketCode, q),
          ilike(supportTickets.issueDetail, q),
          ilike(supportTickets.assignedPIC, q)
        )
      )
      .limit(5),

    db
      .select()
      .from(leads)
      .where(
        or(
          ilike(leads.prospectName, q),
          ilike(leads.socialHandle, q),
          ilike(leads.messagePreview, q)
        )
      )
      .limit(5),
  ]);

  return {
    customers: customerRows.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      fullName: c.fullName,
      socialHandle: c.socialHandle,
      maskedPhone: maskPhone(c.phone),
      segment: c.segment,
    })),
    orders: orderRows.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      productName: o.productName,
      variantName: o.variantName,
      pipelineStatus: o.pipelineStatus,
      totalPrice: o.totalPrice,
    })),
    tickets: ticketRows.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      category: t.category,
      issueDetail: t.issueDetail,
      status: t.status,
    })),
    leads: leadRows.map((l) => ({
      id: l.id,
      prospectName: l.prospectName,
      socialHandle: l.socialHandle,
      messagePreview: l.messagePreview,
      status: l.status,
    })),
  };
}
