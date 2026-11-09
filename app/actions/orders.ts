'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { orders, customers, PipelineStatus, PaymentStatus } from '@/lib/schema';
import { eq, desc, ilike } from 'drizzle-orm';

export interface OrderPopulatedItem {
  id: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerSegment: string;
  customerChannel: string;
  customerPhone: string;
  productName: string;
  variantName: string;
  quantity: number;
  totalPrice: number;
  batchName: string;
  briefNotes: string;
  designUrl: string;
  pipelineStatus: PipelineStatus;
  stuckAlert: boolean;
  daysInStage: number;
  paymentStatus: string;
  vendorName: string;
  enteredStageAt: string;
  createdAt: string;
}

export interface PipelineBoardData {
  ORDER_MASUK: OrderPopulatedItem[];
  DESAIN_APPROVAL: OrderPopulatedItem[];
  PRODUKSI_VENDOR: OrderPopulatedItem[];
  QA_PACKING: OrderPopulatedItem[];
  SELESAI: OrderPopulatedItem[];
  stats: {
    totalOrders: number;
    totalRevenue: number;
    inProduction: number;
    overdueSLA: number;
    readyForShipping: number;
  };
}

export async function getOrdersByStage(batchFilter?: string): Promise<PipelineBoardData> {
  await connectToDatabase();

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

  const board: PipelineBoardData = {
    ORDER_MASUK: [],
    DESAIN_APPROVAL: [],
    PRODUKSI_VENDOR: [],
    QA_PACKING: [],
    SELESAI: [],
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

    const isOverdue = elapsedMs > THREE_DAYS_MS && o.pipelineStatus !== 'SELESAI';
    const stuckAlert = o.stuckAlert || isOverdue;

    if (stuckAlert) {
      board.stats.overdueSLA += 1;
    }

    if (o.pipelineStatus === 'PRODUKSI_VENDOR') {
      board.stats.inProduction += 1;
    }

    if (o.pipelineStatus === 'QA_PACKING' || o.pipelineStatus === 'SELESAI') {
      board.stats.readyForShipping += 1;
    }

    const item: OrderPopulatedItem = {
      id: o.id,
      orderCode: o.orderCode,
      customerId: cust?.id || '',
      customerName: cust?.fullName || 'Pelanggan Umum',
      customerSegment: cust?.segment || 'REGULAR',
      customerChannel: cust?.acquisitionChannel || 'WHATSAPP',
      customerPhone: cust?.phone || '',
      productName: o.productName,
      variantName: o.variantName,
      quantity: o.quantity,
      totalPrice: o.totalPrice,
      batchName: o.batchName,
      briefNotes: o.briefNotes || '',
      designUrl: o.designUrl || '',
      pipelineStatus: o.pipelineStatus as PipelineStatus,
      stuckAlert,
      daysInStage,
      paymentStatus: o.paymentStatus || 'LUNAS',
      vendorName: o.vendorName || 'Vendor Akrilik Jaya',
      enteredStageAt: new Date(enteredTime).toISOString(),
      createdAt: o.createdAt.toISOString(),
    };

    const status = o.pipelineStatus as PipelineStatus;
    if (board[status]) {
      board[status].push(item);
    } else {
      board.ORDER_MASUK.push(item);
    }
  }

  return board;
}

export async function createOrder(data: {
  customerId: string;
  productName: string;
  variantName: string;
  quantity: number;
  totalPrice: number;
  batchName?: string;
  briefNotes?: string;
  designUrl?: string;
  paymentStatus?: 'PENDING_DP' | 'DP_PAID' | 'LUNAS';
  vendorName?: string;
}) {
  await connectToDatabase();

  // Verify customer exists
  const [customer] = await db.select().from(customers).where(eq(customers.id, data.customerId)).limit(1);
  if (!customer) {
    throw new Error('Pelanggan tidak valid');
  }

  // Generate order code #LUN-ORD-xxx
  const [lastOrder] = await db
    .select({ orderCode: orders.orderCode })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(1);

  let nextNum = 101;
  if (lastOrder?.orderCode) {
    const match = lastOrder.orderCode.match(/#LUN-ORD-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  const orderCode = `#LUN-ORD-${String(nextNum).padStart(3, '0')}`;

  const [newOrder] = await db
    .insert(orders)
    .values({
      orderCode,
      customerId: data.customerId,
      productName: data.productName,
      variantName: data.variantName,
      quantity: Number(data.quantity) || 1,
      totalPrice: Number(data.totalPrice) || 0,
      batchName: data.batchName || 'Batch #12 Keychain & Artprint',
      briefNotes: data.briefNotes || '',
      designUrl: data.designUrl || '',
      pipelineStatus: 'ORDER_MASUK',
      stuckAlert: false,
      enteredStageAt: new Date(),
      paymentStatus: (data.paymentStatus || 'LUNAS') as PaymentStatus,
      vendorName: data.vendorName || 'Vendor Akrilik Jaya',
    })
    .returning();

  revalidatePath('/pipeline');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return {
    ...newOrder,
    _id: newOrder.id,
    briefNotes: newOrder.briefNotes || '',
    designUrl: newOrder.designUrl || '',
    vendorName: newOrder.vendorName || 'Vendor Akrilik Jaya',
    enteredStageAt: newOrder.enteredStageAt.toISOString(),
    createdAt: newOrder.createdAt.toISOString(),
    updatedAt: newOrder.updatedAt.toISOString(),
  };
}

export async function updateOrderStatus(orderId: string, nextStatus: PipelineStatus) {
  await connectToDatabase();

  const [updated] = await db
    .update(orders)
    .set({
      pipelineStatus: nextStatus,
      enteredStageAt: new Date(),
      stuckAlert: false,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  revalidatePath('/pipeline');
  revalidatePath('/customers');
  revalidatePath('/support');
  revalidatePath('/dashboard');

  return {
    ...updated,
    _id: updated?.id,
  };
}

export async function submitPublicOrder(data: {
  fullName: string;
  phone: string;
  socialHandle?: string;
  city?: string;
  productName: string;
  variantName: string;
  quantity: number;
  totalPrice: number;
  briefNotes: string;
  designUrl: string;
  paymentPlan: 'DP_50' | 'LUNAS_100';
  batchName?: string;
}) {
  await connectToDatabase();

  const cleanPhone = data.phone.trim().replace(/[^0-9]/g, '');

  // 1. Find or create Customer
  const [existingCust] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, cleanPhone.length > 0 ? cleanPhone : data.phone.trim()))
    .limit(1);

  let targetCustomer = existingCust;

  if (!targetCustomer) {
    const [lastCust] = await db
      .select({ customerId: customers.customerId })
      .from(customers)
      .orderBy(desc(customers.createdAt))
      .limit(1);

    let nextNum = 1;
    if (lastCust?.customerId) {
      const match = lastCust.customerId.match(/CUST-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const customerId = `CUST-${String(nextNum).padStart(3, '0')}`;

    const [createdCust] = await db
      .insert(customers)
      .values({
        customerId,
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        socialHandle: data.socialHandle?.trim() || '@cust_' + customerId.toLowerCase(),
        city: data.city?.trim() || 'Jakarta',
        acquisitionChannel: 'WEB_FORM',
        segment: 'REGULAR',
        acceptsMarketing: true,
      })
      .returning();

    targetCustomer = createdCust;
  }

  // 2. Generate unique orderCode #LUN-ORD-xxx
  const [lastOrder] = await db
    .select({ orderCode: orders.orderCode })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(1);

  let nextOrderNum = 1;
  if (lastOrder?.orderCode) {
    const match = lastOrder.orderCode.match(/#LUN-ORD-(\d+)/);
    if (match) {
      nextOrderNum = parseInt(match[1], 10) + 1;
    }
  }
  const orderCode = `#LUN-ORD-${String(nextOrderNum).padStart(3, '0')}`;
  const paymentStatus: PaymentStatus = data.paymentPlan === 'DP_50' ? 'DP_PAID' : 'LUNAS';

  const [newOrder] = await db
    .insert(orders)
    .values({
      orderCode,
      customerId: targetCustomer.id,
      productName: data.productName,
      variantName: data.variantName,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      batchName: data.batchName || 'Batch #12 Open',
      briefNotes: data.briefNotes,
      designUrl: data.designUrl,
      pipelineStatus: 'ORDER_MASUK',
      stuckAlert: false,
      enteredStageAt: new Date(),
      paymentStatus,
      vendorName: 'Maklon Mitra Studio',
    })
    .returning();

  try {
    revalidatePath('/pipeline');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return {
    success: true,
    orderCode,
    orderId: newOrder.id,
    customerName: targetCustomer.fullName,
    productName: newOrder.productName,
    variantName: newOrder.variantName,
    quantity: newOrder.quantity,
    totalPrice: newOrder.totalPrice,
    paymentStatus,
  };
}
