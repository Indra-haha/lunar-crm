'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { customerFeedbacks, orders, customers } from '@/lib/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export async function lookupOrderForSurvey(query: string) {
  await connectToDatabase();
  const clean = query.trim();
  if (!clean) return { found: false };

  const cleanCode = clean.toUpperCase().replace(/^#/, '');

  let [foundRow] = await db
    .select({
      order: orders,
      customer: {
        fullName: customers.fullName,
        phone: customers.phone,
        city: customers.city,
        socialHandle: customers.socialHandle,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(or(ilike(orders.orderCode, `%${cleanCode}%`), eq(orders.orderCode, clean)))
    .limit(1);

  if (!foundRow) {
    const cleanDigits = clean.replace(/[^0-9]/g, '');
    const [cust] = await db
      .select()
      .from(customers)
      .where(or(eq(customers.phone, clean), eq(customers.phone, cleanDigits)))
      .limit(1);

    if (cust) {
      const [ord] = await db
        .select({
          order: orders,
          customer: {
            fullName: customers.fullName,
            phone: customers.phone,
            city: customers.city,
            socialHandle: customers.socialHandle,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.customerId, cust.id))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      foundRow = ord;
    }
  }

  if (!foundRow) {
    return { found: false };
  }

  const order = foundRow.order;
  const cust = foundRow.customer;

  return {
    found: true,
    order: {
      id: order.id,
      orderCode: order.orderCode,
      productName: order.productName,
      variantName: order.variantName,
      quantity: order.quantity,
      batchName: order.batchName,
      pipelineStatus: order.pipelineStatus,
      customerName: cust?.fullName || 'Pelanggan',
      socialHandle: cust?.socialHandle || '',
      city: cust?.city || 'Jakarta',
      maskedPhone: maskPhone(cust?.phone || ''),
    },
  };
}

export async function submitPublicFeedback(data: {
  orderCode: string;
  orderId?: string;
  rating: number;
  comment: string;
  allowSocialPin?: boolean;
  aspectRatings?: {
    quality: number;
    speed: number;
    service: number;
  };
}) {
  await connectToDatabase();

  let targetOrderId = data.orderId;
  let customerName = 'Pelanggan Lunarchivve';
  let socialHandle = '@customer';
  let city = 'Jakarta';

  if (!targetOrderId) {
    const cleanCode = data.orderCode.trim().toUpperCase().replace(/^#/, '');
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
    } else {
      const [anyRow] = await db
        .select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .limit(1);

      if (anyRow?.order) {
        targetOrderId = anyRow.order.id;
        if (anyRow.customer) {
          customerName = anyRow.customer.fullName || customerName;
          socialHandle = anyRow.customer.socialHandle || socialHandle;
          city = anyRow.customer.city || city;
        }
      } else {
        throw new Error('Belum ada pesanan terdaftar di sistem.');
      }
    }
  } else {
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
  }

  // Create feedback record
  const [newFeedback] = await db
    .insert(customerFeedbacks)
    .values({
      orderId: targetOrderId,
      rating: data.rating,
      comment: data.comment.trim(),
      isPinnedForSocial: data.rating >= 4 && data.allowSocialPin ? true : false,
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

  return {
    success: true,
    feedbackId: newFeedback.id,
    customerName,
    rating: newFeedback.rating,
    voucherCode: 'LUNAR-CSAT-15',
  };
}
