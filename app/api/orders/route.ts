import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { orders, customers, PipelineStatus, PaymentStatus, AcquisitionChannel } from '@/lib/schema';
import { eq, desc, ilike } from 'drizzle-orm';
import { getNextCustomerId, getNextOrderCode } from '@/lib/idGenerators';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  try {
    await connectToDatabase();

    let batchFilter: string | null = null;
    if (request && request.url) {
      const url = new URL(request.url);
      batchFilter = url.searchParams.get('batch');
    }

    let query = db
      .select({
        order: orders,
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          segment: customers.segment,
          phone: customers.phone,
          acquisitionChannel: customers.acquisitionChannel,
        },
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));

    if (batchFilter && batchFilter !== 'ALL' && batchFilter !== 'Semua Batch PO') {
      // @ts-expect-error drizzle conditional where
      query = query.where(ilike(orders.batchName, `%${batchFilter}%`));
    }

    const orderRows = await query;

    const board = {
      ORDER_MASUK: [] as unknown[],
      DESAIN_APPROVAL: [] as unknown[],
      PRODUKSI_VENDOR: [] as unknown[],
      QA_PACKING: [] as unknown[],
      SELESAI: [] as unknown[],
      stats: {
        totalOrders: orderRows.length,
        totalRevenue: 0,
        inProduction: 0,
        overdueSLA: 0,
        readyForShipping: 0,
      },
    };

    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    for (const row of orderRows) {
      const o = row.order;
      const cust = row.customer;

      board.stats.totalRevenue += o.totalPrice || 0;

      const enteredTime = o.enteredStageAt ? new Date(o.enteredStageAt).getTime() : new Date(o.createdAt).getTime();
      const elapsedMs = now - enteredTime;
      const daysInStage = Math.max(1, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)) + 1);

      let stuckAlert = false;
      if (o.pipelineStatus === 'PRODUKSI_VENDOR' && elapsedMs > THREE_DAYS_MS) {
        stuckAlert = true;
        board.stats.overdueSLA += 1;
      }
      if (o.pipelineStatus === 'DESAIN_APPROVAL' && elapsedMs > 2 * 24 * 60 * 60 * 1000) {
        stuckAlert = true;
      }

      if (o.pipelineStatus === 'PRODUKSI_VENDOR') {
        board.stats.inProduction += 1;
      }
      if (o.pipelineStatus === 'QA_PACKING' || o.pipelineStatus === 'SELESAI') {
        board.stats.readyForShipping += 1;
      }

      const item = {
        id: o.id,
        orderCode: o.orderCode,
        customerId: o.customerId,
        customerName: cust?.fullName || 'Anonim',
        customerSegment: cust?.segment || 'REGULAR',
        customerChannel: cust?.acquisitionChannel || 'WHATSAPP',
        customerPhone: cust?.phone || '-',
        productName: o.productName,
        variantName: o.variantName || 'Standar',
        quantity: o.quantity,
        totalPrice: o.totalPrice,
        batchName: o.batchName || 'Batch #12 Open',
        briefNotes: o.briefNotes || '',
        designUrl: o.designUrl || '',
        pipelineStatus: o.pipelineStatus as PipelineStatus,
        stuckAlert,
        daysInStage,
        paymentStatus: o.paymentStatus || 'LUNAS',
        vendorName: o.vendorName || 'Maklon Subur',
        enteredStageAt: (o.enteredStageAt || o.createdAt).toISOString(),
        createdAt: o.createdAt.toISOString(),
      };

      const stage = o.pipelineStatus as keyof typeof board;
      if (Array.isArray(board[stage])) {
        (board[stage] as Array<typeof item>).push(item);
      }
    }

    return NextResponse.json(board);
  } catch (err) {
    console.error('API GET /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal memuat papan pipeline', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Check if this is a public order from /pesan
    if (data.isPublic || data.customerPhone) {
      const cleanPhone = String(data.customerPhone || '').trim();
      const cleanName = String(data.customerName || '').trim();
      const cleanHandle = String(data.socialHandle || '').trim();

      if (!cleanName || !cleanPhone || !data.productName) {
        return NextResponse.json({ error: 'Nama, nomor WhatsApp, dan pilihan produk wajib diisi.' }, { status: 400 });
      }

      let [targetCust] = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, cleanPhone))
        .limit(1);

      if (!targetCust) {
        const nextCid = await getNextCustomerId();
        const [createdCust] = await db
          .insert(customers)
          .values({
            customerId: nextCid,
            fullName: cleanName,
            phone: cleanPhone,
            socialHandle: cleanHandle || `@${cleanName.toLowerCase().replace(/\s+/g, '_')}`,
            acquisitionChannel: (data.acquisitionChannel || 'WEB_FORM') as AcquisitionChannel,
            segment: 'REGULAR',
            city: data.city || 'Jakarta',
            acceptsMarketing: data.acceptsMarketing !== false,
          })
          .returning();
        targetCust = createdCust;
      }

      const orderCode = await getNextOrderCode();

      const [newOrder] = await db
        .insert(orders)
        .values({
          orderCode,
          customerId: targetCust.id,
          productName: data.productName,
          variantName: data.variantName || 'Standar',
          quantity: Math.max(1, parseInt(data.quantity, 10) || 1),
          totalPrice: Math.max(0, parseInt(data.totalPrice, 10) || 0),
          batchName: data.batchName || 'Batch #12 Open',
          briefNotes: data.briefNotes || '',
          designUrl: data.designUrl || '',
          pipelineStatus: 'ORDER_MASUK',
          paymentStatus: (data.paymentStatus || 'PENDING_DP') as PaymentStatus,
          vendorName: data.vendorName || 'Maklon Subur',
          enteredStageAt: new Date(),
        })
        .returning();

      try {
        revalidatePath('/pipeline');
        revalidatePath('/dashboard');
        revalidatePath('/customers');
      } catch {
        // fallback
      }

      return NextResponse.json({
        success: true,
        orderCode: newOrder.orderCode,
        orderId: newOrder.id,
        customerId: targetCust.customerId,
      }, { status: 201 });
    }

    // Otherwise, standard admin order creation
    if (!data.customerId || !data.productName) {
      return NextResponse.json({ error: 'Pelanggan dan produk wajib diisi.' }, { status: 400 });
    }

    const orderCode = await getNextOrderCode();

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderCode,
        customerId: data.customerId,
        productName: data.productName.trim(),
        variantName: data.variantName?.trim() || 'Standar',
        quantity: Math.max(1, parseInt(data.quantity, 10) || 1),
        totalPrice: Math.max(0, parseInt(data.totalPrice, 10) || 0),
        batchName: data.batchName?.trim() || 'Batch #12 Open',
        briefNotes: data.briefNotes?.trim() || '',
        pipelineStatus: 'ORDER_MASUK',
        paymentStatus: (data.paymentStatus || 'LUNAS') as PaymentStatus,
        vendorName: data.vendorName?.trim() || 'Maklon Subur',
        enteredStageAt: new Date(),
      })
      .returning();

    try {
      revalidatePath('/pipeline');
      revalidatePath('/dashboard');
      revalidatePath('/customers');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, order: { ...newOrder, _id: newOrder.id } }, { status: 201 });
  } catch (err) {
    console.error('API POST /api/orders error:', err);
    return NextResponse.json({ error: 'Gagal membuat pesanan', details: String(err) }, { status: 500 });
  }
}
