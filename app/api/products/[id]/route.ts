import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { products } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!prod) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json(prod);
  } catch (err) {
    console.error('API GET /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memuat produk', details: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'Nama produk tidak boleh kosong.' }, { status: 400 });
      }
      updateValues.name = name;
    }
    if (data.category !== undefined) {
      updateValues.category = data.category;
    }
    if (data.basePrice !== undefined) {
      updateValues.basePrice = Math.max(0, Math.round(Number(data.basePrice) || 0));
    }
    if (data.vendorName !== undefined) {
      updateValues.vendorName = data.vendorName.trim();
    }
    if (data.batchAvailable !== undefined) {
      updateValues.batchAvailable = data.batchAvailable.trim();
    }
    if (data.isActive !== undefined) {
      updateValues.isActive = Boolean(data.isActive);
    }
    if (data.imageUrl !== undefined) {
      updateValues.imageUrl = data.imageUrl.trim();
    }
    if (data.description !== undefined) {
      updateValues.description = data.description.trim();
    }
    if (data.variants !== undefined && Array.isArray(data.variants)) {
      updateValues.variants = data.variants.map((v: { name?: string; additionalPrice?: number; stockOrQuota?: number }) => ({
        name: v.name?.trim() || 'Standar',
        additionalPrice: Math.max(0, Math.round(Number(v.additionalPrice) || 0)),
        stockOrQuota: Math.max(0, Math.round(Number(v.stockOrQuota) || 0)),
      }));
    }

    const [updated] = await db
      .update(products)
      .set(updateValues)
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Produk tidak ditemukan atau gagal diperbarui.' }, { status: 404 });
    }

    try {
      revalidatePath('/products');
      revalidatePath('/pesan');
      revalidatePath('/pipeline');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true, product: { ...updated, _id: updated.id } });
  } catch (err) {
    console.error('API PUT /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui produk', details: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    await db.delete(products).where(eq(products.id, id));

    try {
      revalidatePath('/products');
      revalidatePath('/pesan');
      revalidatePath('/pipeline');
    } catch {
      // fallback
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API DELETE /api/products/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus produk', details: String(err) }, { status: 500 });
  }
}
