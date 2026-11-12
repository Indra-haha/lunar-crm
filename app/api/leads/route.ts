import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { leads, customers, orders, messageTemplates, messageLogs, PaymentStatus, LeadStatus, InboundChannel } from '@/lib/schema';
import { eq, desc, asc, or } from 'drizzle-orm';
import { getNextCustomerId, getNextOrderCode } from '@/lib/idGenerators';
import { maskPhone } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const [leadRows, templateRows, logRows] = await Promise.all([
      db.select().from(leads).orderBy(desc(leads.inboundAt)),
      db.select().from(messageTemplates).orderBy(asc(messageTemplates.title)),
      db.select().from(messageLogs).orderBy(desc(messageLogs.createdAt)).limit(50),
    ]);

    const now = Date.now();
    const formattedLeads = leadRows.map((l) => {
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

    const formattedTemplates = templateRows.map((t) => ({
      id: t.id,
      title: t.title,
      triggerKey: t.triggerKey,
      content: t.content,
      category: t.category,
    }));

    const formattedLogs = logRows.map((l) => ({
      id: l.id,
      recipientName: l.recipientName,
      recipientPhone: l.recipientPhone,
      maskedPhone: maskPhone(l.recipientPhone),
      templateKey: l.templateKey,
      templateTitle: l.templateTitle,
      messageContent: l.messageContent,
      channel: (l.channel as 'WHATSAPP') || 'WHATSAPP',
      status: (l.status as 'SENT' | 'DELIVERED' | 'FAILED') || 'SENT',
      dispatchedBy: l.dispatchedBy,
      referenceType: (l.referenceType as 'LEAD' | 'ORDER' | 'TICKET' | 'PROMO_DORMANT') || undefined,
      dispatchedAt: l.createdAt ? new Date(l.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
    }));

    return NextResponse.json({
      leads: formattedLeads,
      templates: formattedTemplates,
      messageLogs: formattedLogs,
    });
  } catch (err) {
    console.error('API GET /api/leads error:', err);
    return NextResponse.json({ error: 'Gagal memuat antrean leads', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // 1. Action: Convert Lead to Order
    if (data.action === 'convert') {
      const { leadId, orderData } = data;
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) {
        return NextResponse.json({ error: 'Lead tidak ditemukan.' }, { status: 404 });
      }

      const [existingCust] = await db
        .select()
        .from(customers)
        .where(or(eq(customers.phone, lead.phone || ''), eq(customers.socialHandle, lead.socialHandle)))
        .limit(1);

      let targetCustomer = existingCust;

      if (!targetCustomer) {
        const nextCid = await getNextCustomerId();
        const [createdCust] = await db
          .insert(customers)
          .values({
            customerId: nextCid,
            fullName: lead.prospectName,
            phone: lead.phone || '081200000000',
            socialHandle: lead.socialHandle,
            acquisitionChannel: lead.inboundChannel === 'INSTAGRAM_DM' ? 'INSTAGRAM_DM' : 'WHATSAPP',
            segment: 'REGULAR',
            city: 'Jakarta',
            acceptsMarketing: true,
          })
          .returning();
        targetCustomer = createdCust;
      }

      const orderCode = await getNextOrderCode();

      const [newOrder] = await db
        .insert(orders)
        .values({
          orderCode,
          customerId: targetCustomer.id,
          productName: orderData.productName || 'Custom Acrylic Keychain',
          variantName: orderData.variantName || 'Standar',
          quantity: Math.max(1, parseInt(orderData.quantity, 10) || 50),
          totalPrice: Math.max(0, parseInt(orderData.totalPrice, 10) || 450000),
          batchName: orderData.batchName || 'Batch #12 Open',
          briefNotes: orderData.briefNotes || `Konversi dari prospek: ${lead.messagePreview}`,
          pipelineStatus: 'ORDER_MASUK',
          paymentStatus: (orderData.paymentStatus || 'LUNAS') as PaymentStatus,
          vendorName: 'Maklon Subur',
          enteredStageAt: new Date(),
        })
        .returning();

      await db
        .update(leads)
        .set({
          status: 'CONVERTED',
          convertedCustomerId: targetCustomer.id,
          firstResponseAt: lead.firstResponseAt || new Date(),
          updatedAt: new Date(),
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

      return NextResponse.json({
        success: true,
        orderId: newOrder.id,
        orderCode: newOrder.orderCode,
        customerId: targetCustomer.id,
      }, { status: 201 });
    }

    // 2. Action: Create Fast Response Template
    if (data.action === 'create_template') {
      const { title, content, triggerKey, category } = data;
      if (!title || !content) {
        return NextResponse.json({ error: 'Judul dan konten template wajib diisi.' }, { status: 400 });
      }

      const [created] = await db
        .insert(messageTemplates)
        .values({
          title: title.trim(),
          content: content.trim(),
          triggerKey: (triggerKey || title.toLowerCase().replace(/\s+/g, '_')).trim(),
          category: category || 'katalog',
        })
        .returning();

      try {
        revalidatePath('/leads');
      } catch {
        // fallback
      }

      return NextResponse.json(created, { status: 201 });
    }

    // 3. Action: Record FRT
    if (data.action === 'record_frt') {
      const { leadId } = data;
      const [updated] = await db
        .update(leads)
        .set({
          firstResponseAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId))
        .returning();

      try {
        revalidatePath('/leads');
        revalidatePath('/dashboard');
      } catch {
        // fallback
      }

      return NextResponse.json({ success: true, firstResponseAt: updated?.firstResponseAt });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (err) {
    console.error('API POST /api/leads error:', err);
    return NextResponse.json({ error: 'Gagal memproses aksi lead', details: String(err) }, { status: 500 });
  }
}
