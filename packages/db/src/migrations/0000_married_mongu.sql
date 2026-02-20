CREATE TYPE "public"."job_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."label_project_status" AS ENUM('draft', 'ready', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_event_id" text,
	"amount_usd_cents" integer NOT NULL,
	"tokens_granted" integer NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_image" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"image_status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"api_key_id" text,
	"prompt" text NOT NULL,
	"status" "label_project_status" DEFAULT 'draft' NOT NULL,
	"output_coco" boolean DEFAULT true NOT NULL,
	"output_class_pngs" boolean DEFAULT false NOT NULL,
	"output_yolo" boolean DEFAULT false NOT NULL,
	"total_images" integer DEFAULT 0 NOT NULL,
	"processed_images" integer DEFAULT 0 NOT NULL,
	"failed_images" integer DEFAULT 0 NOT NULL,
	"result_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text,
	"request_id" text NOT NULL,
	"status" "job_status" NOT NULL,
	"input_image_name" text,
	"prompt" text,
	"output_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_image" ADD CONSTRAINT "label_image_project_id_label_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."label_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_project" ADD CONSTRAINT "label_project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_project" ADD CONSTRAINT "label_project_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_job" ADD CONSTRAINT "request_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_job" ADD CONSTRAINT "request_job_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash_uidx" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_id_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_prefix_idx" ON "api_key" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_key_revoked_idx" ON "api_key" USING btree ("revoked");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchase_checkout_session_uidx" ON "credit_purchase" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchase_event_uidx" ON "credit_purchase" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_user_id_idx" ON "credit_purchase" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_status_idx" ON "credit_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "label_image_project_id_idx" ON "label_image" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "label_image_status_idx" ON "label_image" USING btree ("image_status");--> statement-breakpoint
CREATE INDEX "label_project_user_id_idx" ON "label_project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "label_project_status_idx" ON "label_project" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "request_job_request_id_uidx" ON "request_job" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_job_user_id_idx" ON "request_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_job_status_idx" ON "request_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");