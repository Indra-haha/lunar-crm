import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { supportTickets, qaChecklists, orders, customers, TicketCategory, TicketStatus, PipelineStatus } from '@/lib/schema';
import { eq, desc, ilike, inArray } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';
import { getNextTicketCode } from '@/lib/idGenerators';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  try {
    await connectToDatabase();

    let categoryFilter: string | null = null;
    if (request && request.url) {
      const url = new URL(request.url);
      categoryFilter = url.searchParams.get('category');
    }

    let ticketQuery = db
      .select({
        ticket: supportTickets,
        order: {
          id: orders.id,
          orderCode: orders.orderCode,
          productName: orders.productName,
        },
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phone: customers.phone,
        },
      })
      .from(supportTickets)
      .leftJoin(orders, eq(supportTickets.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(supportTickets.createdAt));

    if (categoryFilter && categoryFilter !== 'ALL' && categoryFilter !== 'Semua Tiket') {
      let mappedCat: TicketCategory = 'CATEGORY_A';
      if (categoryFilter.includes('CATEGORY_A') || categoryFilter.includes('Kategori A') || categoryFilter.includes('Cacat')) {
        mappedCat = 'CATEGORY_A';
      } else if (categoryFilter.includes('CATEGORY_B') || categoryFilter.includes('Kategori B') || categoryFilter.includes('Ekspedisi')) {
        mappedCat = 'CATEGORY_B';
      } else if (categoryFilter.includes('CATEGORY_C') || categoryFilter.includes('Kategori C') || categoryFilter.includes('Teknis')) {
        mappedCat = 'CATEGORY_C';
      }
      // @ts-expect-error drizzle conditional
      ticketQuery = ticketQuery.where(eq(supportTickets.category, mappedCat));
    }

    const [ticketRows, qaOrderRows] = await Promise.all([
      ticketQuery,
      db
        .select({
          order: orders,
          customer: {
            fullName: customers.fullName,
            phone: customers.phone,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(inArray(orders.pipelineStatus, ['PRODUKSI_VENDOR', 'QA_PACKING']))
        .orderBy(desc(orders.createdAt)),
    ]);

    const categoryMap: Record<TicketCategory, string> = {
      CATEGORY_A: 'Kategori A: Cacat Fisik / Salah Cetak',
      CATEGORY_B: 'Kategori B: Keterlambatan Ekspedisi',
      CATEGORY_C: 'Kategori C: Pertanyaan Teknis / Status',
    };

    const formattedTickets = ticketRows.map((r) => {
      const tk = r.ticket;
      const ord = r.order;
      const cust = r.customer;

      let crtText = 'Dalam antrean';
      if (tk.resolvedAt) {
        const diffMs = new Date(tk.resolvedAt).getTime() - new Date(tk.createdAt).getTime();
        const diffMinutes = Math.floor(diffMs / (60 * 1000));
        if (diffMinutes < 60) {
          crtText = `Selesai dlm ${diffMinutes}m`;
        } else {
          const diffHours = (diffMinutes / 60).toFixed(1);
          crtText = `Selesai dlm ${diffHours} Jam`;
        }
      } else {
        const diffMs = Date.now() - new Date(tk.createdAt).getTime();
        const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
        crtText = `Berjalan ${diffHours} Jam`;
      }

      return {
        id: tk.id,
        ticketCode: tk.ticketCode,
        orderId: ord?.id || '',
        orderCode: ord?.orderCode || '-',
        customerId: cust?.id || '',
        customerName: cust?.fullName || 'Pelanggan',
        customerPhone: cust?.phone || '',
        maskedPhone: maskPhone(cust?.phone || ''),
        category: tk.category as TicketCategory,
        categoryLabel: categoryMap[tk.category as TicketCategory] || tk.category,
        issueDetail: tk.issueDetail,
        assignedPIC: tk.assignedPIC,
        status: tk.status as TicketStatus,
        resolvedAt: tk.resolvedAt ? tk.resolvedAt.toISOString() : null,
        durationCRT: crtText,
        createdAt: tk.createdAt.toISOString(),
      };
    });

    const formattedQAOrders = qaOrderRows.map((row) => ({
      id: row.order.id,
      orderCode: row.order.orderCode,
      customerName: row.customer?.fullName || 'Anonim',
      customerPhone: row.customer?.phone || '-',
      productName: row.order.productName,
      variantName: row.order.variantName || 'Standar',
      quantity: row.order.quantity,
      batchName: row.order.batchName || 'Batch #12 Open',
      briefNotes: row.order.briefNotes || '',
      designUrl: row.order.designUrl || '',
      pipelineStatus: row.order.pipelineStatus as PipelineStatus,
    }));

    return NextResponse.json({
      tickets: formattedTickets,
      qaOrders: formattedQAOrders,
    });
  } catch (err) {
    console.error('API GET /api/support error:', err);
    return NextResponse.json({ error: 'Gagal memuat tiket dan QA', details: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // 1. Digital QC Checklist Submission
    if (data.action === 'qa_checklist') {
      const { orderId, specMatched, quantityMatched, noDefects, peelOffFilmChecked, photoProofUrl, inspectorName, notes, updateToQAPacking } = data;

      const [existingQa] = await db.select().from(qaChecklists).where(eq(qaChecklists.orderId, orderId)).limit(1);

      let checklist;
      if (existingQa) {
        [checklist] = await db
          .update(qaChecklists)
          .set({
            specMatched: Boolean(specMatched),
            quantityMatched: Boolean(quantityMatched),
            noDefects: Boolean(noDefects),
            peelOffFilmChecked: peelOffFilmChecked ?? true,
            photoProofUrl: photoProofUrl || '',
            inspectorName: inspectorName || 'Said Najih',
            notes: notes || '',
            checkedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(qaChecklists.id, existingQa.id))
          .returning();
      } else {
        [checklist] = await db
          .insert(qaChecklists)
          .values({
            orderId,
            specMatched: Boolean(specMatched),
            quantityMatched: Boolean(quantityMatched),
            noDefects: Boolean(noDefects),
            peelOffFilmChecked: peelOffFilmChecked ?? true,
            photoProofUrl: photoProofUrl || '',
            inspectorName: inspectorName || 'Said Najih',
            notes: notes || '',
          })
          .returning();
      }

      if (updateToQAPacking) {
        await db
          .update(orders)
          .set({
            pipelineStatus: 'QA_PACKING',
            enteredStageAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
      }

      try {
        revalidatePath('/support');
        revalidatePath('/pipeline');
        revalidatePath('/dashboard');
      } catch {
        // fallback
      }

      return NextResponse.json({ success: true, checklistId: checklist.id });
    }

    // 2. Public Complaint Submission from /komplain
    if (data.action === 'submit_complaint') {
      const orderCodeSearch = data.orderCode?.trim();
      const contactPhone = data.phone?.trim();

      if ((!orderCodeSearch && !data.orderId) || !data.issueDetail) {
        return NextResponse.json({ error: 'Kode pesanan dan rincian keluhan wajib diisi.' }, { status: 400 });
      }

      let targetOrderId = data.orderId;
      if (!targetOrderId && orderCodeSearch) {
        const cleanCode = orderCodeSearch.toUpperCase().replace(/^#/, '');
        const [matchingOrder] = await db
          .select({ id: orders.id })
          .from(orders)
          .where(ilike(orders.orderCode, `%${cleanCode}%`))
          .limit(1);
        if (matchingOrder) {
          targetOrderId = matchingOrder.id;
        }
      }

      if (!targetOrderId) {
        const [anyOrder] = await db.select({ id: orders.id }).from(orders).limit(1);
        if (anyOrder) {
          targetOrderId = anyOrder.id;
        } else {
          return NextResponse.json({ error: 'Belum ada pesanan terdaftar di sistem.' }, { status: 404 });
        }
      }

      const ticketCode = await getNextTicketCode();

      let fullIssue = data.issueDetail.trim();
      if (data.expectedResolution) {
        fullIssue += `\n[Solusi Diinginkan: ${data.expectedResolution.trim()}]`;
      }
      if (data.customerName || contactPhone) {
        fullIssue += `\n[Pelapor: ${data.customerName || '-'} | Kontak: ${contactPhone || '-'}]`;
      }
      if (data.photoProofUrl || data.evidencePhotoUrl) {
        fullIssue += `\n[Foto Bukti Fisik: ${data.photoProofUrl || data.evidencePhotoUrl}]`;
      }

      const [newTicket] = await db
        .insert(supportTickets)
        .values({
          ticketCode,
          orderId: targetOrderId,
          category: (data.category as TicketCategory) || 'CATEGORY_A',
          issueDetail: fullIssue,
          assignedPIC: 'Said Najih',
          status: 'OPEN',
        })
        .returning();

      try {
        revalidatePath('/support');
        revalidatePath('/dashboard');
      } catch {
        // fallback
      }

      return NextResponse.json({
        success: true,
        ticketCode: newTicket.ticketCode,
        ticketId: newTicket.id,
      }, { status: 201 });
    }

    // 3. Manual Ticket Creation
    const { orderId, category, issueDetail, assignedPIC } = data;
    if (!orderId || !issueDetail) {
      return NextResponse.json({ error: 'Pesanan dan rincian masalah wajib diisi.' }, { status: 400 });
    }

    const ticketCode = await getNextTicketCode();

    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        ticketCode,
        orderId,
        category: (category as TicketCategory) || 'CATEGORY_A',
        issueDetail: issueDetail.trim(),
        status: 'OPEN',
        assignedPIC: assignedPIC || 'Said Najih',
      })
      .returning();

    try {
      revalidatePath('/support');
      revalidatePath('/dashboard');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, ticket: { ...newTicket, _id: newTicket.id } }, { status: 201 });
  } catch (err) {
    console.error('API POST /api/support error:', err);
    return NextResponse.json({ error: 'Gagal memproses aksi support', details: String(err) }, { status: 500 });
  }
}
