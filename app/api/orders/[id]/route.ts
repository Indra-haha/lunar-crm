import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { orders, PipelineStatus, PaymentStatus } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (err) {
    console.error('API GET /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesanan', details: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.pipelineStatus !== undefined) {
      updateFields.pipelineStatus = data.pipelineStatus as PipelineStatus;
      updateFields.enteredStageAt = new Date();
    }
    if (data.paymentStatus !== undefined) {
      updateFields.paymentStatus = data.paymentStatus as PaymentStatus;
    }
    if (data.vendorName !== undefined) {
      updateFields.vendorName = String(data.vendorName).trim();
    }
    if (data.briefNotes !== undefined) {
      updateFields.briefNotes = String(data.briefNotes).trim();
    }

    const [updated] = await db
      .update(orders)
      .set(updateFields)
      .where(eq(orders.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    try {
      revalidatePath('/pipeline');
      revalidatePath('/dashboard');
      revalidatePath('/customers');
      revalidatePath('/support');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, order: { ...updated, _id: updated.id } });
  } catch (err) {
    console.error('API PATCH /api/orders/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui pesanan', details: String(err) }, { status: 500 });
  }
}
