import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { supportTickets, orders, customers, TicketStatus } from '@/lib/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const cleanQuery = decodeURIComponent(id).trim();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);
    const whereClause = isUuid
      ? or(ilike(supportTickets.ticketCode, `%${cleanQuery}%`), eq(supportTickets.id, cleanQuery))
      : ilike(supportTickets.ticketCode, `%${cleanQuery}%`);

    const [row] = await db
      .select({
        ticket: supportTickets,
        order: {
          id: orders.id,
          orderCode: orders.orderCode,
          productName: orders.productName,
          variantName: orders.variantName,
          batchName: orders.batchName,
        },
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phone: customers.phone,
        },
      })
      .from(supportTickets)
      .leftJoin(orders, eq(supportTickets.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      id: row.ticket.id,
      ticketCode: row.ticket.ticketCode,
      orderCode: row.order?.orderCode || '-',
      productName: row.order?.productName || '-',
      variantName: row.order?.variantName || '-',
      customerName: row.customer?.fullName || 'Pelanggan',
      customerPhone: maskPhone(row.customer?.phone || ''),
      category: row.ticket.category,
      issueDetail: row.ticket.issueDetail,
      status: row.ticket.status,
      assignedPIC: row.ticket.assignedPIC,
      resolvedAt: row.ticket.resolvedAt ? row.ticket.resolvedAt.toISOString() : null,
      createdAt: row.ticket.createdAt.toISOString(),
      updatedAt: row.ticket.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('API GET /api/support/[id] error:', err);
    return NextResponse.json({ error: 'Gagal mencari tiket', details: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateFields.status = data.status as TicketStatus;
      if (data.status === 'RESOLVED') {
        updateFields.resolvedAt = new Date();
      }
    }
    if (data.assignedPIC !== undefined) {
      updateFields.assignedPIC = String(data.assignedPIC).trim();
    }

    const [updated] = await db
      .update(supportTickets)
      .set(updateFields)
      .where(eq(supportTickets.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 });
    }

    try {
      revalidatePath('/support');
      revalidatePath('/dashboard');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, status: updated.status, ticket: { ...updated, _id: updated.id } });
  } catch (err) {
    console.error('API PATCH /api/support/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui tiket', details: String(err) }, { status: 500 });
  }
}
