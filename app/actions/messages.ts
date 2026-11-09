'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { messageLogs, customers } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';

export interface MessageAuditLogItem {
  id: string;
  recipientName: string;
  recipientPhone: string;
  maskedPhone: string;
  templateKey: string;
  templateTitle: string;
  messageContent: string;
  channel: 'WHATSAPP';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  dispatchedBy: string;
  referenceType?: 'LEAD' | 'ORDER' | 'TICKET' | 'PROMO_DORMANT';
  dispatchedAt: string;
}

export async function getMessageAuditLogs(): Promise<MessageAuditLogItem[]> {
  await connectToDatabase();

  const logs = await db
    .select()
    .from(messageLogs)
    .orderBy(desc(messageLogs.createdAt))
    .limit(50);

  return logs.map((l) => ({
    id: l.id,
    recipientName: l.recipientName,
    recipientPhone: l.recipientPhone,
    maskedPhone: maskPhone(l.recipientPhone),
    templateKey: l.templateKey,
    templateTitle: l.templateTitle,
    messageContent: l.messageContent,
    channel: (l.channel || 'WHATSAPP') as 'WHATSAPP',
    status: (l.status || 'SENT') as 'SENT' | 'DELIVERED' | 'FAILED',
    dispatchedBy: l.dispatchedBy,
    referenceType: l.referenceType as 'LEAD' | 'ORDER' | 'TICKET' | 'PROMO_DORMANT' | undefined,
    dispatchedAt: l.createdAt.toISOString(),
  }));
}

export async function schedulePromoBroadcast(data: {
  batchName: string;
  scheduleOption: 'IMMEDIATE' | 'BATCH_NEXT' | 'CUSTOM';
  customDate?: string;
  promoTemplate: string;
}) {
  await connectToDatabase();

  // Find dormant customers who accepted marketing
  const dormantCustomers = await db
    .select()
    .from(customers)
    .where(and(eq(customers.segment, 'DORMANT'), eq(customers.acceptsMarketing, true)));

  // Create message log entries for each
  for (const c of dormantCustomers) {
    await db.insert(messageLogs).values({
      recipientName: c.fullName,
      recipientPhone: c.phone,
      templateKey: 'DORMANT_PROMO_REPEAT',
      templateTitle: `Broadcast Promo PO ${data.batchName}`,
      messageContent: data.promoTemplate.replace('{nama}', c.fullName),
      channel: 'WHATSAPP',
      status: 'SENT',
      dispatchedBy: 'Nadia Putri (Super Admin)',
      referenceType: 'PROMO_DORMANT',
      referenceId: c.id,
    });
  }

  try {
    revalidatePath('/dashboard');
    revalidatePath('/leads');
  } catch {
    // fallback
  }

  return {
    success: true,
    targetedCount: dormantCustomers.length,
    scheduledAt: data.scheduleOption === 'IMMEDIATE' ? 'Segera (Hari Ini)' : data.customDate || 'Jadwal Batch #13 Open',
    message: `Jadwal siaran promo PO ${data.batchName} berhasil disiapkan untuk ${dormantCustomers.length} pelanggan pasif (berizin marketing).`,
  };
}
