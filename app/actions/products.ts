'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, db } from '@/lib/db';
import { products, IProductVariant, ProductCategory } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getNextProductCode } from '@/lib/idGenerators';

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

  const name = data.name?.trim();
  if (!name) {
    throw new Error('Nama produk tidak boleh kosong.');
  }

  // Auto generate productCode PRD-xxx if not provided or ensure custom code is unique
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
      throw new Error(`Kode produk "${code}" sudah digunakan. Gunakan kode lain.`);
    }
  }

  const cleanedVariants: IProductVariant[] = (
    data.variants && data.variants.length > 0
      ? data.variants
      : [{ name: 'Standar', additionalPrice: 0, stockOrQuota: 100 }]
  ).map((v) => ({
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
      vendorName: (data.vendorName?.trim() || 'Maklon Akrilik Subur'),
      variants: cleanedVariants,
      batchAvailable: data.batchAvailable?.trim() || 'Batch #12 Open',
      isActive: true,
      imageUrl: data.imageUrl?.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
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

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error('Nama produk tidak boleh kosong.');
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
  if (data.variants !== undefined) {
    updateValues.variants = data.variants.map((v) => ({
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
    throw new Error('Produk tidak ditemukan atau gagal diperbarui.');
  }

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
