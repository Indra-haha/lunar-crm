import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { customers, orders, supportTickets, AcquisitionChannel, CustomerSegment } from '@/lib/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const [c] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!c) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });
    }

    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, c.id))
      .orderBy(desc(orders.createdAt));

    const orderIds = orderList.map((o) => o.id);
    const ticketList = orderIds.length > 0
      ? await db
          .select()
          .from(supportTickets)
          .where(inArray(supportTickets.orderId, orderIds))
          .orderBy(desc(supportTickets.createdAt))
      : [];

    const totalOrders = orderList.length;
    const totalSpend = orderList.reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);
    const aov = totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0;

    const detailData = {
      customer: {
        id: c.id,
        customerId: c.customerId,
        fullName: c.fullName,
        socialHandle: c.socialHandle,
        rawPhone: c.phone,
        maskedPhone: maskPhone(c.phone),
        acquisitionChannel: c.acquisitionChannel as AcquisitionChannel,
        segment: c.segment as CustomerSegment,
        acceptsMarketing: c.acceptsMarketing,
        avatarUrl: c.avatarUrl || '',
        city: c.city || 'Jakarta',
        createdAt: c.createdAt.toISOString(),
      },
      metrics: {
        totalOrders,
        totalSpend,
        aov,
        retentionBatch: `${Math.min(totalOrders, 5)}/6 Batch`,
      },
      orders: orderList.map((ord) => ({
        id: ord.id,
        orderCode: ord.orderCode,
        productName: ord.productName,
        variantName: ord.variantName,
        quantity: ord.quantity,
        totalPrice: ord.totalPrice,
        batchName: ord.batchName,
        pipelineStatus: ord.pipelineStatus,
        paymentStatus: ord.paymentStatus,
        createdAt: ord.createdAt.toISOString(),
      })),
      tickets: ticketList.map((tk) => ({
        id: tk.id,
        ticketCode: tk.ticketCode,
        category: tk.category,
        issueDetail: tk.issueDetail,
        assignedPIC: tk.assignedPIC,
        status: tk.status,
        resolvedAt: tk.resolvedAt ? tk.resolvedAt.toISOString() : null,
        createdAt: tk.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(detailData);
  } catch (err) {
    console.error('API GET /api/customers/[id] error:', err);
    return NextResponse.json({ error: 'Gagal mengambil detail pelanggan', details: String(err) }, { status: 500 });
  }
}

export async function PUT(
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

    if (data.fullName !== undefined) updateFields.fullName = data.fullName.trim();
    if (data.socialHandle !== undefined) updateFields.socialHandle = data.socialHandle.trim();
    if (data.phone !== undefined) updateFields.phone = data.phone.trim();
    if (data.acquisitionChannel !== undefined) updateFields.acquisitionChannel = data.acquisitionChannel;
    if (data.segment !== undefined) updateFields.segment = data.segment;
    if (data.city !== undefined) updateFields.city = data.city.trim();
    if (data.acceptsMarketing !== undefined) updateFields.acceptsMarketing = Boolean(data.acceptsMarketing);

    const [updated] = await db
      .update(customers)
      .set(updateFields)
      .where(eq(customers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });
    }

    try {
      revalidatePath('/customers');
      revalidatePath('/dashboard');
    } catch {
      // fallback
    }

    return NextResponse.json({
      ...updated,
      _id: updated.id,
      maskedPhone: maskPhone(updated.phone),
    });
  } catch (err) {
    console.error('API PUT /api/customers/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui data pelanggan', details: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    await db.delete(customers).where(eq(customers.id, id));

    try {
      revalidatePath('/customers');
      revalidatePath('/dashboard');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API DELETE /api/customers/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus pelanggan', details: String(err) }, { status: 500 });
  }
}
