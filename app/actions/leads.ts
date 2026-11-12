'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { leads, customers, orders, messageTemplates, InboundChannel, LeadStatus, PaymentStatus } from '@/lib/schema';
import { eq, desc, or, asc } from 'drizzle-orm';
import { getNextCustomerId, getNextOrderCode } from '@/lib/idGenerators';

export interface PopulatedLeadItem {
  id: string;
  prospectName: string;
  socialHandle: string;
  phone: string;
  inboundChannel: InboundChannel;
  messagePreview: string;
  inboundAt: string;
  firstResponseAt: string | null;
  status: LeadStatus;
  frtMinutes: number;
  frtBadgeType: 'fast' | 'warning' | 'critical';
  frtLabel: string;
  convertedCustomerId: string | null;
  createdAt: string;
}

export async function getLeads(channelFilter?: string): Promise<PopulatedLeadItem[]> {
  await connectToDatabase();

  let query = db.select().from(leads).orderBy(desc(leads.inboundAt));

  if (channelFilter && channelFilter !== 'all' && channelFilter !== 'Semua') {
    let mappedChannel: InboundChannel = 'WHATSAPP';
    if (channelFilter.toLowerCase().includes('instagram')) mappedChannel = 'INSTAGRAM_DM';
    else if (channelFilter.toLowerCase().includes('tiktok')) mappedChannel = 'TIKTOK_SHOP';
    else if (channelFilter.toLowerCase().includes('whatsapp')) mappedChannel = 'WHATSAPP';
    // @ts-expect-error drizzle conditional
    query = query.where(eq(leads.inboundChannel, mappedChannel));
  }

  const leadRows = await query;
  const now = Date.now();

  return leadRows.map((l) => {
    const inboundTime = new Date(l.inboundAt).getTime();
    let frtMinutes = 0;
    let frtLabel = '';
    let frtBadgeType: 'fast' | 'warning' | 'critical' = 'fast';

    if (l.firstResponseAt) {
      const respTime = new Date(l.firstResponseAt).getTime();
      frtMinutes = Math.max(1, Math.round((respTime - inboundTime) / (60 * 1000)));
      frtLabel = `${frtMinutes}m (Respon)`;
      if (frtMinutes <= 15) {
        frtBadgeType = 'fast';
      } else if (frtMinutes <= 30) {
        frtBadgeType = 'warning';
      } else {
        frtBadgeType = 'critical';
      }
    } else {
      frtMinutes = Math.max(1, Math.round((now - inboundTime) / (60 * 1000)));
      if (frtMinutes <= 15) {
        frtBadgeType = 'fast';
        frtLabel = `${frtMinutes}m (SLA Aman)`;
      } else if (frtMinutes <= 25) {
        frtBadgeType = 'warning';
        frtLabel = `${frtMinutes}m (Limit Dekat)`;
      } else {
        frtBadgeType = 'critical';
        frtLabel = `${frtMinutes}m (>25m Kritis)`;
      }
    }

    return {
      id: l.id,
      prospectName: l.prospectName,
      socialHandle: l.socialHandle,
      phone: l.phone || '',
      inboundChannel: l.inboundChannel as InboundChannel,
      messagePreview: l.messagePreview,
      inboundAt: l.inboundAt.toISOString(),
      firstResponseAt: l.firstResponseAt ? l.firstResponseAt.toISOString() : null,
      status: l.status as LeadStatus,
      frtMinutes,
      frtBadgeType,
      frtLabel,
      convertedCustomerId: l.convertedCustomerId ? l.convertedCustomerId : null,
      createdAt: l.createdAt.toISOString(),
    };
  });
}

export async function recordFirstResponse(leadId: string) {
  await connectToDatabase();

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead tidak ditemukan');

  const now = new Date();
  const updateData: Partial<typeof leads.$inferInsert> = {
    updatedAt: now,
  };
  if (!lead.firstResponseAt) {
    updateData.firstResponseAt = now;
  }
  if (lead.status === 'NEW') {
    updateData.status = 'CONTACTED';
  }

  const [updated] = await db
    .update(leads)
    .set(updateData)
    .where(eq(leads.id, leadId))
    .returning();

  try {
    revalidatePath('/leads');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return { success: true, firstResponseAt: updated.firstResponseAt };
}

export async function convertLeadToOrder(
  leadId: string,
  orderData: {
    productName: string;
    variantName: string;
    quantity: number;
    totalPrice: number;
    briefNotes?: string;
    batchName?: string;
  }
) {
  await connectToDatabase();

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error('Lead tidak ditemukan');

  // Check if customer already exists for this phone or social handle
  const [existingCust] = await db
    .select()
    .from(customers)
    .where(or(eq(customers.phone, lead.phone || ''), eq(customers.socialHandle, lead.socialHandle)))
    .limit(1);

  let targetCustomer = existingCust;

  if (!targetCustomer) {
    const customerId = await getNextCustomerId();

    const [createdCust] = await db
      .insert(customers)
      .values({
        customerId,
        fullName: lead.prospectName,
        socialHandle: lead.socialHandle,
        phone: lead.phone || '081200000000',
        acquisitionChannel: lead.inboundChannel,
        segment: 'REGULAR',
        acceptsMarketing: true,
        city: 'Jakarta',
      })
      .returning();

    targetCustomer = createdCust;
  }

  // Create new Order
  const orderCode = await getNextOrderCode();

  const [newOrder] = await db
    .insert(orders)
    .values({
      orderCode,
      customerId: targetCustomer.id,
      productName: orderData.productName,
      variantName: orderData.variantName,
      quantity: Number(orderData.quantity) || 1,
      totalPrice: Number(orderData.totalPrice) || 50000,
      batchName: orderData.batchName || 'Batch #12 Keychain & Artprint',
      briefNotes: orderData.briefNotes || `Konversi dari ${lead.inboundChannel}`,
      pipelineStatus: 'ORDER_MASUK',
      paymentStatus: 'DP_PAID' as PaymentStatus,
      stuckAlert: false,
      enteredStageAt: new Date(),
    })
    .returning();

  // Update lead
  const now = new Date();
  await db
    .update(leads)
    .set({
      status: 'CONVERTED',
      convertedCustomerId: targetCustomer.id,
      firstResponseAt: lead.firstResponseAt || now,
      updatedAt: now,
    })
    .where(eq(leads.id, leadId));

  try {
    revalidatePath('/leads');
    revalidatePath('/pipeline');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return {
    success: true,
    order: { ...newOrder, _id: newOrder.id },
    customer: { ...targetCustomer, _id: targetCustomer.id },
  };
}

export async function getTemplates() {
  await connectToDatabase();
  const templates = await db.select().from(messageTemplates).orderBy(asc(messageTemplates.createdAt));
  return templates.map((t) => ({
    id: t.id,
    _id: t.id,
    title: t.title,
    content: t.content,
    triggerKey: t.triggerKey,
    category: t.category || 'katalog',
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function createTemplate(data: {
  title: string;
  content: string;
  triggerKey: string;
  category?: string;
}) {
  await connectToDatabase();

  let key = data.triggerKey?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') || '';
  if (!key || key === 'CUSTOM_TEMPLATE') {
    key = data.title.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30) || 'CUSTOM_TEMPLATE';
  }

  // Ensure triggerKey uniqueness
  const [existing] = await db
    .select({ id: messageTemplates.id })
    .from(messageTemplates)
    .where(eq(messageTemplates.triggerKey, key))
    .limit(1);

  if (existing) {
    key = `${key}_${Date.now().toString().slice(-4)}`;
  }

  const [template] = await db
    .insert(messageTemplates)
    .values({
      title: data.title.trim(),
      content: data.content.trim(),
      triggerKey: key,
      category: data.category || 'katalog',
    })
    .returning();

  try {
    revalidatePath('/leads');
  } catch {
    // fallback
  }
  return {
    id: template.id,
    _id: template.id,
    title: template.title,
    content: template.content,
    triggerKey: template.triggerKey,
    category: template.category || 'katalog',
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
