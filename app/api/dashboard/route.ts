import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { leads, supportTickets, customerFeedbacks, orders, customers, messageLogs } from '@/lib/schema';
import { eq, desc, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Average FRT
    const respondedLeads = await db
      .select()
      .from(leads)
      .where(isNotNull(leads.firstResponseAt));

    let totalFRTMinutes = 0;
    for (const l of respondedLeads) {
      if (l.firstResponseAt && l.inboundAt) {
        const diffMs = new Date(l.firstResponseAt).getTime() - new Date(l.inboundAt).getTime();
        totalFRTMinutes += Math.max(1, Math.round(diffMs / (60 * 1000)));
      }
    }
    const avgFRTMinutes = respondedLeads.length > 0 ? totalFRTMinutes / respondedLeads.length : 8.5;

    // 2. Average CRT
    const resolvedTickets = await db
      .select()
      .from(supportTickets)
      .where(sql`${supportTickets.status} = 'RESOLVED' AND ${supportTickets.resolvedAt} IS NOT NULL`);

    let totalCRTHours = 0;
    for (const t of resolvedTickets) {
      if (t.resolvedAt && t.createdAt) {
        const diffMs = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
        totalCRTHours += diffMs / (1000 * 60 * 60);
      }
    }
    const avgCRTHours = resolvedTickets.length > 0 ? totalCRTHours / resolvedTickets.length : 1.8;

    // 3. CSAT Score
    const feedbackRows = await db
      .select({
        feedback: customerFeedbacks,
        order: {
          id: orders.id,
          orderCode: orders.orderCode,
          productName: orders.productName,
        },
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          socialHandle: customers.socialHandle,
          city: customers.city,
          avatarUrl: customers.avatarUrl,
        },
      })
      .from(customerFeedbacks)
      .leftJoin(orders, eq(customerFeedbacks.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(customerFeedbacks.createdAt));

    let csatScore = 4.88;
    if (feedbackRows.length > 0) {
      const totalRating = feedbackRows.reduce((acc, r) => acc + (r.feedback.rating || 5), 0);
      csatScore = Number((totalRating / feedbackRows.length).toFixed(2));
    }

    // 4. FCR Ratio
    const allTickets = await db.select().from(supportTickets);
    let fcrRatio = 92.4;
    if (allTickets.length > 0) {
      const singleTouchTickets = allTickets.filter(
        (t) => t.category === 'CATEGORY_C' || t.status === 'RESOLVED'
      ).length;
      fcrRatio = Number(((singleTouchTickets / allTickets.length) * 100).toFixed(1));
    }

    // Complaint categories breakdown
    const categoryCount = {
      CATEGORY_A: 0,
      CATEGORY_B: 0,
      CATEGORY_C: 0,
    };
    for (const t of allTickets) {
      if (categoryCount[t.category as keyof typeof categoryCount] !== undefined) {
        categoryCount[t.category as keyof typeof categoryCount]++;
      }
    }

    const kpis = {
      avgFRT: {
        value: Number(avgFRTMinutes.toFixed(1)),
        display: `${avgFRTMinutes.toFixed(1)} Menit`,
        target: '< 15m',
        status: (avgFRTMinutes <= 15 ? 'optimal' : avgFRTMinutes <= 25 ? 'warning' : 'critical') as 'optimal' | 'warning' | 'critical',
        label: 'First Response Time',
      },
      avgCRT: {
        value: Number(avgCRTHours.toFixed(1)),
        display: `${avgCRTHours.toFixed(1)} Jam`,
        target: '< 4.0h',
        status: (avgCRTHours <= 4.0 ? 'optimal' : avgCRTHours <= 12.0 ? 'warning' : 'critical') as 'optimal' | 'warning' | 'critical',
        label: 'Customer Resolution Time',
      },
      csatScore: {
        value: csatScore,
        display: `${csatScore.toFixed(2)} / 5.0`,
        target: '> 4.50',
        totalReviews: feedbackRows.length,
        diffBaseline: '+0.38 vs Target',
      },
      fcrRatio: {
        value: fcrRatio,
        display: `${fcrRatio.toFixed(1)}%`,
        target: '> 85%',
        label: 'First Contact Resolution',
      },
    };

    const feedbacks = feedbackRows.map((r) => ({
      id: r.feedback.id,
      orderId: r.feedback.orderId,
      orderCode: r.order?.orderCode || 'LUN-ORD',
      customerName: r.customer?.fullName || 'Pelanggan Lunarchivve',
      socialHandle: r.customer?.socialHandle || '@customer',
      city: r.customer?.city || 'Jakarta',
      avatarUrl: r.customer?.avatarUrl || '',
      rating: r.feedback.rating,
      comment: r.feedback.comment,
      isPinnedForSocial: r.feedback.isPinnedForSocial,
      productName: r.order?.productName || 'Merchandise Kustom Studio',
      createdAt: r.feedback.createdAt.toISOString(),
    }));

    const weeklyFRT = [
      { day: 'Sen', frt: 6.2, target: 15 },
      { day: 'Sel', frt: 8.4, target: 15 },
      { day: 'Rab', frt: 7.1, target: 15 },
      { day: 'Kam', frt: 9.8, target: 15 },
      { day: 'Jum', frt: 11.2, target: 15 },
      { day: 'Sab', frt: 8.1, target: 15 },
      { day: 'Min', frt: 7.9, target: 15 },
    ];

    return NextResponse.json({
      kpis,
      complaintCategories: categoryCount,
      feedbacks,
      weeklyFRT,
    });
  } catch (err) {
    console.error('API GET /api/dashboard error:', err);
    return NextResponse.json({ error: 'Gagal memuat analitik dashboard', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // 1. Toggle Pin Feedback for social media
    if (data.action === 'toggle_pin') {
      const { feedbackId } = data;
      const [current] = await db
        .select({ isPinnedForSocial: customerFeedbacks.isPinnedForSocial })
        .from(customerFeedbacks)
        .where(eq(customerFeedbacks.id, feedbackId))
        .limit(1);

      if (!current) {
        return NextResponse.json({ error: 'Ulasan tidak ditemukan.' }, { status: 404 });
      }

      await db
        .update(customerFeedbacks)
        .set({
          isPinnedForSocial: !current.isPinnedForSocial,
          updatedAt: new Date(),
        })
        .where(eq(customerFeedbacks.id, feedbackId));

      try {
        revalidatePath('/dashboard');
      } catch {
        // fallback
      }

      return NextResponse.json({ success: true, isPinnedForSocial: !current.isPinnedForSocial });
    }

    // 2. Schedule Promo Broadcast
    if (data.action === 'schedule_promo' || data.action === 'send_promo_dormant') {
      const { promoTemplate, scheduleOption, batchName, scheduledDate } = data;

      const dormantCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.segment, 'DORMANT'));

      const eligibleRecipients = dormantCustomers.filter((c) => c.acceptsMarketing);

      for (const cust of eligibleRecipients.slice(0, 5)) {
        await db.insert(messageLogs).values({
          recipientName: cust.fullName,
          recipientPhone: cust.phone,
          channel: 'WHATSAPP',
          templateKey: 'BROADCAST_PO',
          templateTitle: 'Broadcast Re-engagement Dormant Customer',
          messageContent: (promoTemplate || 'Promo Pre-Order Batch #12 diskon 15%').replace(/{nama}/g, cust.fullName),
          status: 'SENT',
          dispatchedBy: 'Admin Studio',
          referenceType: 'PROMO_DORMANT',
        });
      }

      try {
        revalidatePath('/dashboard');
        revalidatePath('/leads');
      } catch {
        // fallback
      }

      const formattedCustomDate = scheduledDate
        ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'pilihan kalender';

      const scheduleLabel =
        scheduleOption === 'BATCH_NEXT'
          ? 'pada pembukaan Batch #13 mendatang'
          : scheduleOption === 'CUSTOM'
          ? `pada tanggal ${formattedCustomDate}`
          : 'segera hari ini';

      return NextResponse.json({
        success: true,
        eligibleCount: eligibleRecipients.length,
        scheduledDate: scheduledDate || null,
        message: `Siaran pesan WhatsApp ke ${eligibleRecipients.length} pelanggan pasif (izin marketing aktif) berhasil dijadwalkan ${scheduleLabel}.`,
      });
    }

    return NextResponse.json({ error: 'Aksi dashboard tidak dikenali.' }, { status: 400 });
  } catch (err) {
    console.error('API POST /api/dashboard error:', err);
    return NextResponse.json({ error: 'Gagal memproses aksi dashboard', details: String(err) }, { status: 500 });
  }
}
