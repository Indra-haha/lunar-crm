CREATE TABLE IF NOT EXISTS "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'STUDIO_ADMIN' NOT NULL,
	"avatar_url" text DEFAULT '',
	"last_login_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username"),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"comment" text NOT NULL,
	"is_pinned_for_social" boolean DEFAULT false NOT NULL,
	"customer_name" varchar(255) DEFAULT '',
	"social_handle" varchar(100) DEFAULT '',
	"city" varchar(100) DEFAULT 'Jakarta',
	"avatar_url" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"social_handle" varchar(100) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"acquisition_channel" varchar(50) DEFAULT 'WHATSAPP' NOT NULL,
	"segment" varchar(50) DEFAULT 'REGULAR' NOT NULL,
	"accepts_marketing" boolean DEFAULT true NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"city" varchar(100) DEFAULT 'Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_name" varchar(255) NOT NULL,
	"social_handle" varchar(100) NOT NULL,
	"phone" varchar(50) DEFAULT '',
	"inbound_channel" varchar(50) DEFAULT 'WHATSAPP' NOT NULL,
	"message_preview" text NOT NULL,
	"inbound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_response_at" timestamp with time zone,
	"status" varchar(50) DEFAULT 'NEW' NOT NULL,
	"converted_customer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"recipient_phone" varchar(50) NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"template_title" varchar(255) NOT NULL,
	"message_content" text NOT NULL,
	"channel" varchar(50) DEFAULT 'WHATSAPP' NOT NULL,
	"status" varchar(50) DEFAULT 'SENT' NOT NULL,
	"dispatched_by" varchar(100) DEFAULT 'Admin Studio' NOT NULL,
	"reference_type" varchar(50),
	"reference_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"trigger_key" varchar(100) NOT NULL,
	"category" varchar(50) DEFAULT 'katalog' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_templates_trigger_key_unique" UNIQUE("trigger_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_code" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_price" integer DEFAULT 0 NOT NULL,
	"batch_name" varchar(255) DEFAULT 'Batch #12 Keychain & Artprint' NOT NULL,
	"brief_notes" text DEFAULT '' NOT NULL,
	"design_url" text DEFAULT '' NOT NULL,
	"pipeline_status" varchar(50) DEFAULT 'ORDER_MASUK' NOT NULL,
	"stuck_alert" boolean DEFAULT false NOT NULL,
	"entered_stage_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_status" varchar(50) DEFAULT 'LUNAS' NOT NULL,
	"vendor_name" varchar(255) DEFAULT 'Vendor Akrilik Jaya' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_code_unique" UNIQUE("order_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'AKRILIK' NOT NULL,
	"base_price" integer DEFAULT 0 NOT NULL,
	"vendor_name" varchar(255) DEFAULT 'Maklon Akrilik Subur' NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"batch_available" varchar(100) DEFAULT 'Batch #12 Open',
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text DEFAULT '',
	"description" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qa_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"spec_matched" boolean DEFAULT false NOT NULL,
	"quantity_matched" boolean DEFAULT false NOT NULL,
	"no_defects" boolean DEFAULT false NOT NULL,
	"peel_off_film_checked" boolean DEFAULT true NOT NULL,
	"photo_proof_url" text DEFAULT '',
	"inspector_name" varchar(100) DEFAULT 'Said Najih' NOT NULL,
	"notes" text DEFAULT '',
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qa_checklists_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"order_id" uuid NOT NULL,
	"category" varchar(50) DEFAULT 'CATEGORY_A' NOT NULL,
	"issue_detail" text NOT NULL,
	"assigned_pic" varchar(100) DEFAULT 'Said Najih' NOT NULL,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_checklists" ADD CONSTRAINT "qa_checklists_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_feedbacks_order" ON "customer_feedbacks" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_segment" ON "customers" USING btree ("segment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_channel" ON "customers" USING btree ("acquisition_channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leads_inbound" ON "leads" USING btree ("inbound_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_logs_created" ON "message_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" USING btree ("pipeline_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_order" ON "support_tickets" USING btree ("order_id");
