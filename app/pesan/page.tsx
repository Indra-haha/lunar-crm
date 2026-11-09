import React, { Suspense } from 'react';
import { connection } from 'next/server';
import PublicOrderClient from './PublicOrderClient';
import { getActiveProductsForOrder } from '@/app/actions/products';

export const instant = false;

async function PublicOrderData() {
  await connection();
  const products = await getActiveProductsForOrder();
  return <PublicOrderClient products={products} />;
}

export default function PublicOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-slate-text-muted text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
            <span>Memuat Formulir Pemesanan Merchandise...</span>
          </div>
        </div>
      }
    >
      <PublicOrderData />
    </Suspense>
  );
}
