import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { customerFeedbacks, orders, customers } from '@/lib/schema';
import { eq, desc, ilike } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const orderCode = url.searchParams.get('orderCode')?.trim();

    if (!orderCode) {
      return NextResponse.json({ error: 'Kode pesanan wajib disertakan.' }, { status: 400 });
    }

    const [row] = await db
      .select({
        order: orders,
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phone: customers.phone,
        },
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.orderCode, orderCode))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: `Pesanan dengan kode "${orderCode}" tidak ditemukan di database studio.` }, { status: 404 });
    }

    const [existingFeedback] = await db
      .select({ id: customerFeedbacks.id, rating: customerFeedbacks.rating, createdAt: customerFeedbacks.createdAt })
      .from(customerFeedbacks)
      .where(eq(customerFeedbacks.orderId, row.order.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      order: {
        id: row.order.id,
        orderCode: row.order.orderCode,
        productName: row.order.productName,
        variantName: row.order.variantName,
        quantity: row.order.quantity,
        batchName: row.order.batchName,
        pipelineStatus: row.order.pipelineStatus,
        customerName: row.customer?.fullName || 'Pelanggan Lunarchivve',
        customerPhone: maskPhone(row.customer?.phone || ''),
        hasReviewed: Boolean(existingFeedback),
        reviewedAt: existingFeedback?.createdAt ? existingFeedback.createdAt.toISOString() : null,
      },
    });
  } catch (err) {
    console.error('API GET /api/feedback error:', err);
    return NextResponse.json({ error: 'Gagal memverifikasi pesanan survei', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const {
      orderId,
      orderCode,
      rating,
      comment,
      allowSocialPin,
      allowSocialShare,
    } = data;

    if (!orderId && !orderCode) {
      return NextResponse.json({ error: 'ID atau kode pesanan wajib diisi.' }, { status: 400 });
    }

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));

    let targetOrderId = orderId;
    let customerName = 'Pelanggan Lunarchivve';
    let socialHandle = '@customer';
    let city = 'Jakarta';

    if (targetOrderId) {
      const [existingRow] = await db
        .select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.id, targetOrderId))
        .limit(1);

      if (existingRow?.customer) {
        customerName = existingRow.customer.fullName || customerName;
        socialHandle = existingRow.customer.socialHandle || socialHandle;
        city = existingRow.customer.city || city;
      }
    } else if (orderCode) {
      const cleanCode = String(orderCode).trim().toUpperCase().replace(/^#/, '');
      const [row] = await db
        .select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(ilike(orders.orderCode, `%${cleanCode}%`))
        .limit(1);

      if (row?.order) {
        targetOrderId = row.order.id;
        if (row.customer) {
          customerName = row.customer.fullName || customerName;
          socialHandle = row.customer.socialHandle || socialHandle;
          city = row.customer.city || city;
        }
      }
    }

    if (!targetOrderId) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan untuk ulasan.' }, { status: 404 });
    }

    const [newFeedback] = await db
      .insert(customerFeedbacks)
      .values({
        orderId: targetOrderId,
        rating: numRating,
        comment: (comment || 'Puas dengan hasil cetak merchandise studio.').trim(),
        isPinnedForSocial: Boolean((allowSocialPin || allowSocialShare) && numRating >= 4),
        customerName,
        socialHandle,
        city,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(customerName)}`,
      })
      .returning();

    try {
      revalidatePath('/dashboard');
      revalidatePath('/survei');
    } catch {
      // fallback
    }

    return NextResponse.json({
      success: true,
      feedbackId: newFeedback.id,
      customerName,
      rating: newFeedback.rating,
      voucherCode: 'LUNAR-CSAT-15',
    }, { status: 201 });
  } catch (err) {
    console.error('API POST /api/feedback error:', err);
    return NextResponse.json({ error: 'Gagal mengirim survei ulasan', details: String(err) }, { status: 500 });
  }
}
