'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { supportTickets, qaChecklists, orders, customers, TicketCategory, TicketStatus, PipelineStatus } from '@/lib/schema';
import { eq, desc, ilike, or, inArray } from 'drizzle-orm';
import { maskPhone } from '@/lib/formatters';
import { getNextTicketCode } from '@/lib/idGenerators';

export interface PopulatedTicketItem {
  id: string;
  ticketCode: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  maskedPhone: string;
  category: TicketCategory;
  categoryLabel: string;
  issueDetail: string;
  assignedPIC: string;
  status: TicketStatus;
  resolvedAt: string | null;
  durationCRT: string;
  createdAt: string;
}

export async function submitQAChecklist(
  orderId: string,
  checks: {
    specMatched: boolean;
    quantityMatched: boolean;
    noDefects: boolean;
    peelOffFilmChecked?: boolean;
    photoProofUrl?: string;
    notes?: string;
  },
  inspectorName: string
) {
  await connectToDatabase();

  const [existingQa] = await db.select().from(qaChecklists).where(eq(qaChecklists.orderId, orderId)).limit(1);

  let qaRecord;
  const now = new Date();

  if (existingQa) {
    const [updated] = await db
      .update(qaChecklists)
      .set({
        specMatched: checks.specMatched,
        quantityMatched: checks.quantityMatched,
        noDefects: checks.noDefects,
        peelOffFilmChecked: checks.peelOffFilmChecked ?? true,
        photoProofUrl: checks.photoProofUrl || '',
        inspectorName: inspectorName || 'Said Najih',
        notes: checks.notes || '',
        checkedAt: now,
        updatedAt: now,
      })
      .where(eq(qaChecklists.orderId, orderId))
      .returning();
    qaRecord = updated;
  } else {
    const [created] = await db
      .insert(qaChecklists)
      .values({
        orderId,
        specMatched: checks.specMatched,
        quantityMatched: checks.quantityMatched,
        noDefects: checks.noDefects,
        peelOffFilmChecked: checks.peelOffFilmChecked ?? true,
        photoProofUrl: checks.photoProofUrl || '',
        inspectorName: inspectorName || 'Said Najih',
        notes: checks.notes || '',
        checkedAt: now,
      })
      .returning();
    qaRecord = created;
  }

  // If all 3 core verifications pass, order transitions automatically to 'SELESAI'
  const isApproved = checks.specMatched && checks.quantityMatched && checks.noDefects;
  if (isApproved) {
    await db
      .update(orders)
      .set({
        pipelineStatus: 'SELESAI' as PipelineStatus,
        enteredStageAt: now,
        stuckAlert: false,
        updatedAt: now,
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

  return {
    success: true,
    isApproved,
    qaRecord: { ...qaRecord, _id: qaRecord.id },
  };
}

export async function createTicket(data: {
  orderId: string;
  category: TicketCategory;
  issueDetail: string;
  assignedPIC?: string;
}) {
  await connectToDatabase();

  // Auto generate ticket code #LUN-TK-xxx
  const ticketCode = await getNextTicketCode();

  const [newTicket] = await db
    .insert(supportTickets)
    .values({
      ticketCode,
      orderId: data.orderId,
      category: data.category,
      issueDetail: data.issueDetail,
      assignedPIC: data.assignedPIC || 'Said Najih',
      status: 'OPEN',
    })
    .returning();

  try {
    revalidatePath('/support');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return { ...newTicket, _id: newTicket.id };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  await connectToDatabase();

  const updateFields: Partial<typeof supportTickets.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };
  if (status === 'RESOLVED') {
    updateFields.resolvedAt = new Date();
  }

  const [updated] = await db
    .update(supportTickets)
    .set(updateFields)
    .where(eq(supportTickets.id, ticketId))
    .returning();

  try {
    revalidatePath('/support');
    revalidatePath('/dashboard');
  } catch {
    // fallback
  }

  return { ...updated, _id: updated?.id };
}

export async function getTickets(category?: string): Promise<PopulatedTicketItem[]> {
  await connectToDatabase();

  let query = db
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

  if (category && category !== 'ALL' && category !== 'Semua Tiket') {
    let mappedCat: TicketCategory = 'CATEGORY_A';
    if (category.includes('CATEGORY_A') || category.includes('Kategori A') || category.includes('Cacat')) {
      mappedCat = 'CATEGORY_A';
    } else if (category.includes('CATEGORY_B') || category.includes('Kategori B') || category.includes('Ekspedisi')) {
      mappedCat = 'CATEGORY_B';
    } else if (category.includes('CATEGORY_C') || category.includes('Kategori C') || category.includes('Teknis')) {
      mappedCat = 'CATEGORY_C';
    }
    // @ts-expect-error drizzle conditional
    query = query.where(eq(supportTickets.category, mappedCat));
  }

  const rows = await query;

  return rows.map((r) => {
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

    const categoryMap: Record<TicketCategory, string> = {
      CATEGORY_A: 'Kategori A: Cacat Fisik / Salah Cetak',
      CATEGORY_B: 'Kategori B: Keterlambatan Ekspedisi',
      CATEGORY_C: 'Kategori C: Pertanyaan Teknis / Status',
    };

    return {
      id: tk.id,
      ticketCode: tk.ticketCode,
      orderId: ord?.id || '',
      orderCode: ord?.orderCode || '#LUN-ORD-???',
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
}

export async function getQAWorkbenchData() {
  await connectToDatabase();

  const rows = await db
    .select({
      order: orders,
      customer: {
        id: customers.id,
        fullName: customers.fullName,
        phone: customers.phone,
        segment: customers.segment,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(inArray(orders.pipelineStatus, ['QA_PACKING', 'PRODUKSI_VENDOR', 'SELESAI']))
    .orderBy(desc(orders.createdAt));

  const orderIds = rows.map((r) => r.order.id);
  const qas = orderIds.length > 0
    ? await db.select().from(qaChecklists).where(inArray(qaChecklists.orderId, orderIds))
    : [];

  const qaMap = new Map();
  for (const q of qas) {
    qaMap.set(q.orderId, q);
  }

  return rows.map((r) => {
    const o = r.order;
    const cust = r.customer;
    const qa = qaMap.get(o.id);

    return {
      id: o.id,
      orderCode: o.orderCode,
      customerName: cust?.fullName || 'Pelanggan',
      customerSegment: cust?.segment || 'REGULAR',
      customerPhone: cust?.phone || '',
      maskedPhone: maskPhone(cust?.phone || ''),
      productName: o.productName,
      variantName: o.variantName,
      quantity: o.quantity,
      totalPrice: o.totalPrice,
      batchName: o.batchName,
      briefNotes: o.briefNotes || '',
      designUrl: o.designUrl || '',
      pipelineStatus: o.pipelineStatus,
      qaChecklist: qa
        ? {
            specMatched: qa.specMatched,
            quantityMatched: qa.quantityMatched,
            noDefects: qa.noDefects,
            peelOffFilmChecked: qa.peelOffFilmChecked,
            photoProofUrl: qa.photoProofUrl,
            inspectorName: qa.inspectorName,
            notes: qa.notes,
            checkedAt: qa.checkedAt?.toISOString(),
          }
        : null,
    };
  });
}

export async function lookupOrderForComplaint(query: string) {
  await connectToDatabase();
  const clean = query.trim();
  if (!clean) return { found: false };

  // Match by orderCode directly or regex/ilike
  const normalizedClean = clean.toUpperCase().replace(/^#/, '');

  let [foundRow] = await db
    .select({
      order: orders,
      customer: {
        fullName: customers.fullName,
        phone: customers.phone,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(or(ilike(orders.orderCode, `%${normalizedClean}%`), eq(orders.orderCode, clean)))
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
      maskedPhone: maskPhone(cust?.phone || ''),
    },
  };
}

export async function submitPublicComplaint(data: {
  orderCode: string;
  orderId?: string;
  customerName?: string;
  phone?: string;
  category: TicketCategory;
  issueDetail: string;
  photoProofUrl?: string;
  expectedResolution?: string;
}) {
  await connectToDatabase();

  let targetOrderId = data.orderId;

  if (!targetOrderId) {
    const cleanCode = data.orderCode.trim().toUpperCase().replace(/^#/, '');
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.orderCode, `%${cleanCode}%`))
      .limit(1);

    if (order) {
      targetOrderId = order.id;
    } else {
      const [anyOrder] = await db.select({ id: orders.id }).from(orders).limit(1);
      if (anyOrder) {
        targetOrderId = anyOrder.id;
      } else {
        throw new Error('Belum ada data pesanan di sistem.');
      }
    }
  }

  // Generate unique ticketCode #LUN-TK-xxx
  const ticketCode = await getNextTicketCode();

  let fullIssue = data.issueDetail.trim();
  if (data.expectedResolution) {
    fullIssue += `\n[Solusi Diinginkan: ${data.expectedResolution}]`;
  }
  if (data.customerName || data.phone) {
    fullIssue += `\n[Pelapor: ${data.customerName || '-'} | Kontak: ${data.phone || '-'}]`;
  }
  if (data.photoProofUrl) {
    fullIssue += `\n[Bukti Foto/Video: ${data.photoProofUrl}]`;
  }

  const [newTicket] = await db
    .insert(supportTickets)
    .values({
      ticketCode,
      orderId: targetOrderId,
      category: data.category,
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

  return {
    success: true,
    ticketCode,
    ticketId: newTicket.id,
    createdAt: newTicket.createdAt.toISOString(),
    category: newTicket.category,
    assignedPIC: newTicket.assignedPIC,
  };
}

export async function lookupPublicTicket(ticketCode: string) {
  await connectToDatabase();
  const clean = ticketCode.trim().toUpperCase().replace(/^#/, '');
  if (!clean) return { found: false };

  const [row] = await db
    .select({
      ticket: supportTickets,
      order: {
        id: orders.id,
        orderCode: orders.orderCode,
        productName: orders.productName,
        variantName: orders.variantName,
        batchName: orders.batchName,
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
    .where(ilike(supportTickets.ticketCode, `%${clean}%`))
    .limit(1);

  if (!row) return { found: false };

  const ticket = row.ticket;
  const ord = row.order;
  const cust = row.customer;

  const categoryMap: Record<TicketCategory, string> = {
    CATEGORY_A: 'Kategori A: Cacat Fisik / Salah Cetak (Zero Hassle Reprint)',
    CATEGORY_B: 'Kategori B: Keterlambatan Ekspedisi / Kurir',
    CATEGORY_C: 'Kategori C: Pertanyaan Teknis & Layanan',
  };

  return {
    found: true,
    ticket: {
      ticketCode: ticket.ticketCode,
      category: ticket.category,
      categoryLabel: categoryMap[ticket.category as TicketCategory] || ticket.category,
      issueDetail: ticket.issueDetail,
      assignedPIC: ticket.assignedPIC,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      orderCode: ord?.orderCode || '-',
      productName: ord?.productName || '-',
      customerName: cust?.fullName || 'Pelanggan',
      maskedPhone: maskPhone(cust?.phone || ''),
    },
  };
}
