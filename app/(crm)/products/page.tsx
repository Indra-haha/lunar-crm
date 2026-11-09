import React, { Suspense } from 'react';
import { connection } from 'next/server';
import ProductsClient from './ProductsClient';
import { getProducts } from '@/app/actions/products';

export const dynamic = 'force-dynamic';

async function ProductsData() {
  await connection();
  const products = await getProducts();
  return <ProductsClient initialProducts={products} />;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-slate-text-muted text-xs">
            <span className="w-5 h-5 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
            <span>Memuat Katalog Master Produk &amp; Varian...</span>
          </div>
        </div>
      }
    >
      <ProductsData />
    </Suspense>
  );
}
