CREATE TYPE "public"."job_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."request_batch_item_status" AS ENUM('queued', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."request_batch_job_status" AS ENUM('queued', 'processing', 'completed', 'completed_with_errors', 'failed');--> statement-breakpoint
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
CREATE TABLE "auto_label_project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"api_key_id" text,
	"prompt" text DEFAULT '' NOT NULL,
	"threshold" double precision DEFAULT 0.5 NOT NULL,
	"mask_threshold" double precision DEFAULT 0.5 NOT NULL,
	"latest_batch_job_id" text,
	"latest_batch_request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_label_project_image" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"input_s3_key" text NOT NULL,
	"image_width" integer,
	"image_height" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "request_batch_item" (
	"job_id" text NOT NULL,
	"item_index" integer NOT NULL,
	"user_id" text NOT NULL,
	"input_s3_key" text NOT NULL,
	"status" "request_batch_item_status" DEFAULT 'queued' NOT NULL,
	"output_prefix" text,
	"output_count" integer DEFAULT 0 NOT NULL,
	"masks_json" jsonb,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "request_batch_item_pk" PRIMARY KEY("job_id","item_index")
);
--> statement-breakpoint
CREATE TABLE "request_batch_job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text,
	"request_id" text NOT NULL,
	"status" "request_batch_job_status" DEFAULT 'queued' NOT NULL,
	"payload" jsonb,
	"threshold" double precision,
	"mask_threshold" double precision,
	"total_items" integer DEFAULT 0 NOT NULL,
	"queued_items" integer DEFAULT 0 NOT NULL,
	"processing_items" integer DEFAULT 0 NOT NULL,
	"success_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
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
	"payload" jsonb,
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
ALTER TABLE "auto_label_project" ADD CONSTRAINT "auto_label_project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_label_project" ADD CONSTRAINT "auto_label_project_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_label_project" ADD CONSTRAINT "auto_label_project_latest_batch_job_id_request_batch_job_id_fk" FOREIGN KEY ("latest_batch_job_id") REFERENCES "public"."request_batch_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_label_project_image" ADD CONSTRAINT "auto_label_project_image_project_id_auto_label_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."auto_label_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_label_project_image" ADD CONSTRAINT "auto_label_project_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_batch_item" ADD CONSTRAINT "request_batch_item_job_id_request_batch_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."request_batch_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_batch_item" ADD CONSTRAINT "request_batch_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_batch_job" ADD CONSTRAINT "request_batch_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_batch_job" ADD CONSTRAINT "request_batch_job_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_job" ADD CONSTRAINT "request_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_job" ADD CONSTRAINT "request_job_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash_uidx" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_id_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_prefix_idx" ON "api_key" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_key_revoked_idx" ON "api_key" USING btree ("revoked");--> statement-breakpoint
CREATE INDEX "auto_label_project_user_id_idx" ON "auto_label_project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auto_label_project_user_id_created_at_idx" ON "auto_label_project" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "auto_label_project_latest_batch_job_id_idx" ON "auto_label_project" USING btree ("latest_batch_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auto_label_project_image_project_id_input_s3_key_uidx" ON "auto_label_project_image" USING btree ("project_id","input_s3_key");--> statement-breakpoint
CREATE INDEX "auto_label_project_image_project_id_idx" ON "auto_label_project_image" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "auto_label_project_image_user_id_project_id_idx" ON "auto_label_project_image" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchase_checkout_session_uidx" ON "credit_purchase" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchase_event_uidx" ON "credit_purchase" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_user_id_idx" ON "credit_purchase" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_purchase_status_idx" ON "credit_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_batch_item_user_id_job_id_idx" ON "request_batch_item" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "request_batch_item_job_id_idx" ON "request_batch_item" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "request_batch_item_status_idx" ON "request_batch_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_batch_job_user_id_idx" ON "request_batch_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_batch_job_user_id_job_id_idx" ON "request_batch_job" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "request_batch_job_status_idx" ON "request_batch_job" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "request_job_request_id_uidx" ON "request_job" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_job_user_id_idx" ON "request_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_job_status_idx" ON "request_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");