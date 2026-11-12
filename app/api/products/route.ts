import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { products, ProductCategory, IProductVariant } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getNextProductCode } from '@/lib/idGenerators';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  try {
    await connectToDatabase();

    let categoryFilter: string | null = null;
    let activeOnly = false;

    if (request && request.url) {
      const url = new URL(request.url);
      categoryFilter = url.searchParams.get('category');
      activeOnly = url.searchParams.get('active') === 'true';
    }

    const conditions = [];
    if (categoryFilter && categoryFilter !== 'ALL') {
      conditions.push(eq(products.category, categoryFilter as ProductCategory));
    }
    if (activeOnly) {
      conditions.push(eq(products.isActive, true));
    }

    const query =
      conditions.length > 0
        ? db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt))
        : db.select().from(products).orderBy(desc(products.createdAt));

    const rows = await query;

    const formatted = rows.map((p) => ({
      id: p.id,
      productCode: p.productCode,
      name: p.name,
      category: p.category as ProductCategory,
      basePrice: p.basePrice,
      vendorName: p.vendorName,
      variants: (p.variants || []) as IProductVariant[],
      batchAvailable: p.batchAvailable || 'Batch #12 Open',
      isActive: p.isActive,
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('API GET /api/products error:', err);
    return NextResponse.json(
      { error: 'Gagal memuat katalog produk', details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const name = data.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Nama produk tidak boleh kosong.' }, { status: 400 });
    }

    let code = data.productCode?.trim().toUpperCase();
    if (!code) {
      code = await getNextProductCode();
    } else {
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.productCode, code))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: `Kode produk "${code}" sudah digunakan. Gunakan kode lain.` },
          { status: 409 }
        );
      }
    }

    const cleanedVariants: IProductVariant[] = (
      data.variants && Array.isArray(data.variants) && data.variants.length > 0
        ? data.variants
        : [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }]
    ).map((v: { name?: string; additionalPrice?: number; stockOrQuota?: number }) => ({
      name: v.name?.trim() || 'Standar',
      additionalPrice: Math.max(0, Math.round(Number(v.additionalPrice) || 0)),
      stockOrQuota: Math.max(0, Math.round(Number(v.stockOrQuota) || 0)),
    }));

    const [newProd] = await db
      .insert(products)
      .values({
        productCode: code,
        name,
        category: data.category || 'AKRILIK',
        basePrice: Math.max(0, Math.round(Number(data.basePrice) || 0)),
        vendorName: data.vendorName?.trim() || 'Maklon Akrilik Subur',
        variants: cleanedVariants,
        batchAvailable: data.batchAvailable?.trim() || 'Batch #12 Open',
        isActive: true,
        imageUrl:
          data.imageUrl?.trim() ||
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
        description: data.description?.trim() || '',
      })
      .returning();

    try {
      revalidatePath('/products');
      revalidatePath('/pesan');
      revalidatePath('/pipeline');
    } catch {
      // fallback
    }

    return NextResponse.json(
      {
        success: true,
        product: {
          id: newProd.id,
          _id: newProd.id,
          productCode: newProd.productCode,
          name: newProd.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('API POST /api/products error:', err);
    return NextResponse.json(
      { error: 'Gagal membuat produk baru', details: String(err) },
      { status: 500 }
    );
  }
}
