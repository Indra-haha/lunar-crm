import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- ENUMS & TYPES ---
export type AdminRole = 'SUPER_ADMIN' | 'STUDIO_ADMIN' | 'SUPPORT_STAFF';
export type AcquisitionChannel = 'INSTAGRAM_DM' | 'TIKTOK_SHOP' | 'WHATSAPP' | 'WEB_FORM';
export type CustomerSegment = 'VIP_LOYAL' | 'REGULAR' | 'DORMANT';
export type InboundChannel = 'INSTAGRAM_DM' | 'TIKTOK_SHOP' | 'WHATSAPP';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST';
export type PipelineStatus = 'ORDER_MASUK' | 'DESAIN_APPROVAL' | 'PRODUKSI_VENDOR' | 'QA_PACKING' | 'SELESAI';
export type PaymentStatus = 'PENDING_DP' | 'DP_PAID' | 'LUNAS';
export type TicketCategory = 'CATEGORY_A' | 'CATEGORY_B' | 'CATEGORY_C';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ProductCategory = 'AKRILIK' | 'PHOTOCARD' | 'APPAREL' | 'STATIONERY' | 'LAINNYA';

export interface IProductVariant {
  name: string;
  additionalPrice: number;
  stockOrQuota: number;
}

// --- TABLES ---

// 1. Admins
export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).$type<AdminRole>().default('STUDIO_ADMIN').notNull(),
  avatarUrl: text('avatar_url').default(''),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Customers
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: varchar('customer_id', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  socialHandle: varchar('social_handle', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  acquisitionChannel: varchar('acquisition_channel', { length: 50 }).$type<AcquisitionChannel>().default('WHATSAPP').notNull(),
  segment: varchar('segment', { length: 50 }).$type<CustomerSegment>().default('REGULAR').notNull(),
  acceptsMarketing: boolean('accepts_marketing').default(true).notNull(),
  avatarUrl: text('avatar_url').default('').notNull(),
  city: varchar('city', { length: 100 }).default('Jakarta').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_customers_segment').on(table.segment),
  index('idx_customers_channel').on(table.acquisitionChannel),
]);

// 3. Leads
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  prospectName: varchar('prospect_name', { length: 255 }).notNull(),
  socialHandle: varchar('social_handle', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 50 }).default(''),
  inboundChannel: varchar('inbound_channel', { length: 50 }).$type<InboundChannel>().default('WHATSAPP').notNull(),
  messagePreview: text('message_preview').notNull(),
  inboundAt: timestamp('inbound_at', { withTimezone: true }).defaultNow().notNull(),
  firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
  status: varchar('status', { length: 50 }).$type<LeadStatus>().default('NEW').notNull(),
  convertedCustomerId: uuid('converted_customer_id').references(() => customers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_leads_status').on(table.status),
  index('idx_leads_inbound').on(table.inboundAt),
]);

// 4. Orders
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderCode: varchar('order_code', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  variantName: varchar('variant_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: integer('total_price').default(0).notNull(),
  batchName: varchar('batch_name', { length: 255 }).default('Batch #12 Keychain & Artprint').notNull(),
  briefNotes: text('brief_notes').default('').notNull(),
  designUrl: text('design_url').default('').notNull(),
  pipelineStatus: varchar('pipeline_status', { length: 50 }).$type<PipelineStatus>().default('ORDER_MASUK').notNull(),
  stuckAlert: boolean('stuck_alert').default(false).notNull(),
  enteredStageAt: timestamp('entered_stage_at', { withTimezone: true }).defaultNow().notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).$type<PaymentStatus>().default('LUNAS').notNull(),
  vendorName: varchar('vendor_name', { length: 255 }).default('Vendor Akrilik Jaya').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_orders_status').on(table.pipelineStatus),
  index('idx_orders_customer').on(table.customerId),
]);

// 5. Products
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  productCode: varchar('product_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).$type<ProductCategory>().default('AKRILIK').notNull(),
  basePrice: integer('base_price').default(0).notNull(),
  vendorName: varchar('vendor_name', { length: 255 }).default('Maklon Akrilik Subur').notNull(),
  variants: jsonb('variants').$type<IProductVariant[]>().default([]).notNull(),
  batchAvailable: varchar('batch_available', { length: 100 }).default('Batch #12 Open'),
  isActive: boolean('is_active').default(true).notNull(),
  imageUrl: text('image_url').default(''),
  description: text('description').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. QA Checklists
export const qaChecklists = pgTable('qa_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull().unique(),
  specMatched: boolean('spec_matched').default(false).notNull(),
  quantityMatched: boolean('quantity_matched').default(false).notNull(),
  noDefects: boolean('no_defects').default(false).notNull(),
  peelOffFilmChecked: boolean('peel_off_film_checked').default(true).notNull(),
  photoProofUrl: text('photo_proof_url').default(''),
  inspectorName: varchar('inspector_name', { length: 100 }).default('Said Najih').notNull(),
  notes: text('notes').default(''),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Support Tickets
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketCode: varchar('ticket_code', { length: 50 }).notNull().unique(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  category: varchar('category', { length: 50 }).$type<TicketCategory>().default('CATEGORY_A').notNull(),
  issueDetail: text('issue_detail').notNull(),
  assignedPIC: varchar('assigned_pic', { length: 100 }).default('Said Najih').notNull(),
  status: varchar('status', { length: 50 }).$type<TicketStatus>().default('OPEN').notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_support_tickets_status').on(table.status),
  index('idx_support_tickets_order').on(table.orderId),
]);

// 8. Customer Feedbacks
export const customerFeedbacks = pgTable('customer_feedbacks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').default(5).notNull(),
  comment: text('comment').notNull(),
  isPinnedForSocial: boolean('is_pinned_for_social').default(false).notNull(),
  customerName: varchar('customer_name', { length: 255 }).default(''),
  socialHandle: varchar('social_handle', { length: 100 }).default(''),
  city: varchar('city', { length: 100 }).default('Jakarta'),
  avatarUrl: text('avatar_url').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_customer_feedbacks_order').on(table.orderId),
]);

// 9. Message Templates
export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  triggerKey: varchar('trigger_key', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 50 }).default('katalog').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. Message Logs
export const messageLogs = pgTable('message_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 50 }).notNull(),
  templateKey: varchar('template_key', { length: 100 }).notNull(),
  templateTitle: varchar('template_title', { length: 255 }).notNull(),
  messageContent: text('message_content').notNull(),
  channel: varchar('channel', { length: 50 }).default('WHATSAPP').notNull(),
  status: varchar('status', { length: 50 }).default('SENT').notNull(),
  dispatchedBy: varchar('dispatched_by', { length: 100 }).default('Admin Studio').notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: varchar('reference_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_message_logs_created').on(table.createdAt),
]);

// --- RELATIONS ---
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  leads: many(leads),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  qaChecklist: one(qaChecklists, {
    fields: [orders.id],
    references: [qaChecklists.orderId],
  }),
  tickets: many(supportTickets),
  feedbacks: many(customerFeedbacks),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedCustomerId],
    references: [customers.id],
  }),
}));

export const qaChecklistsRelations = relations(qaChecklists, ({ one }) => ({
  order: one(orders, {
    fields: [qaChecklists.orderId],
    references: [orders.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  order: one(orders, {
    fields: [supportTickets.orderId],
    references: [orders.id],
  }),
}));

export const customerFeedbacksRelations = relations(customerFeedbacks, ({ one }) => ({
  order: one(orders, {
    fields: [customerFeedbacks.orderId],
    references: [orders.id],
  }),
}));

// --- INFERRED TYPES ---
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type QAChecklist = typeof qaChecklists.$inferSelect;
export type NewQAChecklist = typeof qaChecklists.$inferInsert;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;

export type CustomerFeedback = typeof customerFeedbacks.$inferSelect;
export type NewCustomerFeedback = typeof customerFeedbacks.$inferInsert;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;

export type MessageLog = typeof messageLogs.$inferSelect;
export type NewMessageLog = typeof messageLogs.$inferInsert;
