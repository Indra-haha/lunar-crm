'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { customers, orders, supportTickets, AcquisitionChannel, CustomerSegment } from '@/lib/schema';
import { eq, desc, ilike, or, inArray, and } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';
import { getNextCustomerId } from '@/lib/idGenerators';

export interface CustomerFilterParams {
  query?: string;
  channel?: string;
  segment?: string;
}

export interface CustomerListItem {
  id: string;
  customerId: string;
  fullName: string;
  socialHandle: string;
  rawPhone: string;
  maskedPhone: string;
  acquisitionChannel: AcquisitionChannel;
  segment: CustomerSegment;
  acceptsMarketing: boolean;
  avatarUrl: string;
  city: string;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate: string | null;
  createdAt: string;
}

export async function getCustomers(params?: CustomerFilterParams): Promise<CustomerListItem[]> {
  await connectToDatabase();

  const conditions = [];

  if (params?.channel && params.channel !== 'ALL' && params.channel !== 'Semua Kanal (Omni)') {
    let mappedChannel: AcquisitionChannel = 'WHATSAPP';
    if (params.channel.includes('Instagram')) mappedChannel = 'INSTAGRAM_DM';
    else if (params.channel.includes('WhatsApp')) mappedChannel = 'WHATSAPP';
    else if (params.channel.includes('Web')) mappedChannel = 'WEB_FORM';
    else if (params.channel.includes('TikTok')) mappedChannel = 'TIKTOK_SHOP';
    conditions.push(eq(customers.acquisitionChannel, mappedChannel));
  }

  if (params?.segment && params.segment !== 'ALL' && params.segment !== 'Semua Segmen') {
    let mappedSegment: CustomerSegment = 'REGULAR';
    if (params.segment.includes('VIP')) mappedSegment = 'VIP_LOYAL';
    else if (params.segment.includes('Regular')) mappedSegment = 'REGULAR';
    else if (params.segment.includes('Dormant') || params.segment.includes('Pasif')) mappedSegment = 'DORMANT';
    conditions.push(eq(customers.segment, mappedSegment));
  }

  if (params?.query && params.query.trim() !== '') {
    const q = `%${params.query.trim()}%`;
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
    return [];
  }

  // Aggregate orders for these customers
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

  return customerList.map((c) => {
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
      acceptsMarketing: c.acceptsMarketing ?? true,
      avatarUrl: c.avatarUrl || '',
      city: c.city || 'Jakarta',
      totalOrders,
      totalSpend,
      lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export async function createCustomer(data: {
  fullName: string;
  socialHandle: string;
  phone: string;
  acquisitionChannel: AcquisitionChannel;
  segment?: CustomerSegment;
  acceptsMarketing?: boolean;
  avatarUrl?: string;
  city?: string;
}) {
  await connectToDatabase();

  // Generate sequential unique CUST-xxx
  const customerId = await getNextCustomerId();

  const [newCustomer] = await db
    .insert(customers)
    .values({
      customerId,
      fullName: data.fullName,
      socialHandle: data.socialHandle.startsWith('@') ? data.socialHandle : `@${data.socialHandle}`,
      phone: data.phone,
      acquisitionChannel: data.acquisitionChannel,
      segment: data.segment || 'REGULAR',
      acceptsMarketing: data.acceptsMarketing ?? true,
      avatarUrl: data.avatarUrl || '',
      city: data.city || 'Jakarta',
    })
    .returning();

  try {
    revalidatePath('/customers');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return {
    ...newCustomer,
    _id: newCustomer.id,
    city: newCustomer.city || 'Jakarta',
    avatarUrl: newCustomer.avatarUrl || '',
    createdAt: newCustomer.createdAt.toISOString(),
    updatedAt: newCustomer.updatedAt.toISOString(),
  };
}

export async function updateCustomer(
  id: string,
  data: Partial<{
    fullName: string;
    socialHandle: string;
    phone: string;
    acquisitionChannel: AcquisitionChannel;
    segment: CustomerSegment;
    acceptsMarketing: boolean;
    city: string;
  }>
) {
  await connectToDatabase();

  const [updated] = await db
    .update(customers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  try {
    revalidatePath('/customers');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return {
    ...updated,
    _id: updated.id,
  };
}

export async function deleteCustomer(id: string) {
  await connectToDatabase();

  await db.delete(customers).where(eq(customers.id, id));

  try {
    revalidatePath('/customers');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return { success: true };
}

export async function getCustomerDetail(id: string) {
  await connectToDatabase();

  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) {
    throw new Error('Pelanggan tidak ditemukan');
  }

  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
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

  return {
    customer: {
      id: customer.id,
      customerId: customer.customerId,
      fullName: customer.fullName,
      socialHandle: customer.socialHandle,
      rawPhone: customer.phone,
      maskedPhone: maskPhone(customer.phone),
      acquisitionChannel: customer.acquisitionChannel as AcquisitionChannel,
      segment: customer.segment as CustomerSegment,
      acceptsMarketing: customer.acceptsMarketing,
      avatarUrl: customer.avatarUrl || '',
      city: customer.city || 'Jakarta',
      createdAt: customer.createdAt.toISOString(),
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
}
