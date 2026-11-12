import { db } from './db';
import { products, customers, orders, supportTickets } from './schema';

/**
 * Generate next unique product code: PRD-xxx
 */
export async function getNextProductCode(): Promise<string> {
  const existing = await db
    .select({ productCode: products.productCode })
    .from(products);

  const existingCodes = new Set(existing.map((p) => p.productCode.toUpperCase()));
  let maxNum = 0;
  for (const p of existing) {
    const match = p.productCode?.match(/PRD-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `PRD-${String(nextNum).padStart(3, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNum++;
    candidate = `PRD-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

/**
 * Generate next unique customer ID: CUST-xxx
 */
export async function getNextCustomerId(): Promise<string> {
  const existing = await db
    .select({ customerId: customers.customerId })
    .from(customers);

  const existingCodes = new Set(existing.map((c) => c.customerId.toUpperCase()));
  let maxNum = 0;
  for (const c of existing) {
    const match = c.customerId?.match(/CUST-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `CUST-${String(nextNum).padStart(3, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNum++;
    candidate = `CUST-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

/**
 * Generate next unique order code: #LUN-ORD-xxx
 */
export async function getNextOrderCode(): Promise<string> {
  const existing = await db
    .select({ orderCode: orders.orderCode })
    .from(orders);

  const existingCodes = new Set(existing.map((o) => o.orderCode.toUpperCase()));
  let maxNum = 100;
  for (const o of existing) {
    const match = o.orderCode?.match(/#?LUN-ORD-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `#LUN-ORD-${String(nextNum).padStart(3, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNum++;
    candidate = `#LUN-ORD-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}

/**
 * Generate next unique support ticket code: #LUN-TK-xxx
 */
export async function getNextTicketCode(): Promise<string> {
  const existing = await db
    .select({ ticketCode: supportTickets.ticketCode })
    .from(supportTickets);

  const existingCodes = new Set(existing.map((t) => t.ticketCode.toUpperCase()));
  let maxNum = 0;
  for (const t of existing) {
    const match = t.ticketCode?.match(/#?LUN-TK-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `#LUN-TK-${String(nextNum).padStart(3, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNum++;
    candidate = `#LUN-TK-${String(nextNum).padStart(3, '0')}`;
  }
  return candidate;
}
