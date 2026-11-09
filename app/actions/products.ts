'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { products, IProductVariant, ProductCategory } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface ProductItem {
  id: string;
  productCode: string;
  name: string;
  category: 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA';
  basePrice: number;
  vendorName: string;
  variants: IProductVariant[];
  batchAvailable: string;
  isActive: boolean;
  imageUrl?: string;
  description?: string;
  createdAt: string;
}

export async function getProducts(categoryFilter?: string, activeOnly = false): Promise<ProductItem[]> {
  await connectToDatabase();

  const conditions = [];

  if (categoryFilter && categoryFilter !== 'ALL') {
    conditions.push(eq(products.category, categoryFilter as ProductCategory));
  }
  if (activeOnly) {
    conditions.push(eq(products.isActive, true));
  }

  const query = conditions.length > 0
    ? db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt))
    : db.select().from(products).orderBy(desc(products.createdAt));

  const productRows = await query;

  return productRows.map((p) => ({
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
}

export async function getActiveProductsForOrder() {
  return await getProducts('ALL', true);
}

export async function createProduct(data: {
  productCode?: string;
  name: string;
  category: 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA';
  basePrice: number;
  vendorName: string;
  variants: IProductVariant[];
  batchAvailable?: string;
  imageUrl?: string;
  description?: string;
}) {
  await connectToDatabase();

  // Auto generate productCode PRD-xxx if not provided
  let code = data.productCode?.trim().toUpperCase();
  if (!code) {
    const [lastProd] = await db
      .select({ productCode: products.productCode })
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(1);

    let nextNum = 1;
    if (lastProd?.productCode) {
      const match = lastProd.productCode.match(/PRD-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    code = `PRD-${String(nextNum).padStart(3, '0')}`;
  }

  const [newProd] = await db
    .insert(products)
    .values({
      productCode: code,
      name: data.name.trim(),
      category: data.category,
      basePrice: data.basePrice,
      vendorName: data.vendorName.trim(),
      variants: data.variants && data.variants.length > 0 ? data.variants : [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }],
      batchAvailable: data.batchAvailable || 'Batch #12 Open',
      isActive: true,
      imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
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

  return {
    success: true,
    product: {
      id: newProd.id,
      _id: newProd.id,
      productCode: newProd.productCode,
      name: newProd.name,
    },
  };
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    category?: 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA';
    basePrice?: number;
    vendorName?: string;
    variants?: IProductVariant[];
    batchAvailable?: string;
    isActive?: boolean;
    imageUrl?: string;
    description?: string;
  }
) {
  await connectToDatabase();

  const [updated] = await db
    .update(products)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  try {
    revalidatePath('/products');
    revalidatePath('/pesan');
    revalidatePath('/pipeline');
  } catch {
    // fallback
  }

  return { success: true, product: { ...updated, _id: updated?.id } };
}

export async function deleteProduct(id: string) {
  await connectToDatabase();

  await db.delete(products).where(eq(products.id, id));

  try {
    revalidatePath('/products');
    revalidatePath('/pesan');
    revalidatePath('/pipeline');
  } catch {
    // fallback
  }

  return { success: true };
}
