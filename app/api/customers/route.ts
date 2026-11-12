import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { customers, orders, AcquisitionChannel, CustomerSegment } from '@/lib/schema';
import { eq, desc, ilike, or, inArray, and } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';
import { getNextCustomerId } from '@/lib/idGenerators';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  try {
    await connectToDatabase();

    let queryParam: string | null = null;
    let channelParam: string | null = null;
    let segmentParam: string | null = null;

    if (request && request.url) {
      const url = new URL(request.url);
      queryParam = url.searchParams.get('query');
      channelParam = url.searchParams.get('channel');
      segmentParam = url.searchParams.get('segment');
    }

    const conditions = [];

    if (channelParam && channelParam !== 'ALL' && channelParam !== 'Semua Kanal (Omni)') {
      let mappedChannel: AcquisitionChannel = 'WHATSAPP';
      if (channelParam.includes('Instagram') || channelParam === 'INSTAGRAM') mappedChannel = 'INSTAGRAM_DM';
      else if (channelParam.includes('WhatsApp') || channelParam === 'WHATSAPP') mappedChannel = 'WHATSAPP';
      else if (channelParam.includes('Web') || channelParam === 'WEB') mappedChannel = 'WEB_FORM';
      else if (channelParam.includes('TikTok') || channelParam === 'TIKTOK') mappedChannel = 'TIKTOK_SHOP';
      conditions.push(eq(customers.acquisitionChannel, mappedChannel));
    }

    if (segmentParam && segmentParam !== 'ALL' && segmentParam !== 'Semua Segmen') {
      let mappedSegment: CustomerSegment = 'REGULAR';
      if (segmentParam.includes('VIP') || segmentParam === 'VIP') mappedSegment = 'VIP_LOYAL';
      else if (segmentParam.includes('Regular') || segmentParam === 'REGULAR') mappedSegment = 'REGULAR';
      else if (segmentParam.includes('Dormant') || segmentParam.includes('Pasif') || segmentParam === 'DORMANT') mappedSegment = 'DORMANT';
      conditions.push(eq(customers.segment, mappedSegment));
    }

    if (queryParam && queryParam.trim() !== '') {
      const q = `%${queryParam.trim()}%`;
      conditions.push(
        or(
          ilike(customers.fullName, q),
          ilike(customers.customerId, q),
          ilike(customers.socialHandle, q),
          ilike(customers.phone, q)
        )
      );
    }

    const query = conditions.length > 0
      ? db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt))
      : db.select().from(customers).orderBy(desc(customers.createdAt));

    const customerList = await query;

    if (customerList.length === 0) {
      return NextResponse.json([]);
    }

    const customerIds = customerList.map((c) => c.id);
    const orderList = await db
      .select()
      .from(orders)
      .where(inArray(orders.customerId, customerIds))
      .orderBy(desc(orders.createdAt));

    const ordersByCustomer: Record<string, typeof orderList> = {};
    for (const o of orderList) {
      const cid = o.customerId;
      if (!ordersByCustomer[cid]) ordersByCustomer[cid] = [];
      ordersByCustomer[cid].push(o);
    }

    const formatted = customerList.map((c) => {
      const customerOrders = ordersByCustomer[c.id] || [];
      const totalOrders = customerOrders.length;
      const totalSpend = customerOrders.reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);
      const lastOrder = customerOrders[0];

      return {
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
        totalOrders,
        totalSpend,
        lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('API GET /api/customers error:', err);
    return NextResponse.json({ error: 'Gagal memuat data pelanggan', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!data.fullName?.trim() || !data.phone?.trim()) {
      return NextResponse.json({ error: 'Nama dan nomor kontak wajib diisi.' }, { status: 400 });
    }

    const customerId = await getNextCustomerId();

    const rawHandle = data.socialHandle?.trim() || 'customer';
    const normalizedHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

    const [newCustomer] = await db
      .insert(customers)
      .values({
        customerId,
        fullName: data.fullName.trim(),
        socialHandle: normalizedHandle,
        phone: data.phone.trim(),
        acquisitionChannel: data.acquisitionChannel || 'INSTAGRAM_DM',
        segment: data.segment || 'REGULAR',
        acceptsMarketing: data.acceptsMarketing !== false,
        city: data.city?.trim() || 'Jakarta',
        avatarUrl: data.avatarUrl?.trim() || '',
      })
      .returning();

    try {
      revalidatePath('/customers');
      revalidatePath('/dashboard');
    } catch {
      // fallback
    }

    return NextResponse.json(
      {
        ...newCustomer,
        _id: newCustomer.id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('API POST /api/customers error:', err);
    return NextResponse.json({ error: 'Gagal membuat pelanggan baru', details: String(err) }, { status: 500 });
  }
}
