import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "failed"]);
export const jobStatusEnum = pgEnum("job_status", ["success", "failed"]);
export const requestBatchJobStatusEnum = pgEnum("request_batch_job_status", [
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);
export const requestBatchItemStatusEnum = pgEnum("request_batch_item_status", [
  "queued",
  "processing",
  "success",
  "failed",
]);

export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("api_key_hash_uidx").on(table.keyHash),
    index("api_key_user_id_idx").on(table.userId),
    index("api_key_prefix_idx").on(table.keyPrefix),
    index("api_key_revoked_idx").on(table.revoked),
  ],
);
export type ApiKey = InferSelectModel<typeof apiKey>;

export const creditPurchase = pgTable(
  "credit_purchase",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripeEventId: text("stripe_event_id"),
    amountUsdCents: integer("amount_usd_cents").notNull(),
    tokensGranted: integer("tokens_granted").notNull(),
    status: purchaseStatusEnum("status").default("pending").notNull(),
    failureReason: text("failure_reason"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("credit_purchase_checkout_session_uidx").on(table.stripeCheckoutSessionId),
    uniqueIndex("credit_purchase_event_uidx").on(table.stripeEventId),
    index("credit_purchase_user_id_idx").on(table.userId),
    index("credit_purchase_status_idx").on(table.status),
  ],
);

export const requestJob = pgTable(
  "request_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    requestId: text("request_id").notNull(),
    status: jobStatusEnum("status").notNull(),
    inputImageName: text("input_image_name"),
    prompt: text("prompt"),
    outputCount: integer("output_count").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("request_job_request_id_uidx").on(table.requestId),
    index("request_job_user_id_idx").on(table.userId),
    index("request_job_status_idx").on(table.status),
  ],
);
export type RequestJob = InferSelectModel<typeof requestJob>;

export const requestBatchJob = pgTable(
  "request_batch_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    requestId: text("request_id").notNull(),
    status: requestBatchJobStatusEnum("status").default("queued").notNull(),
    prompt: text("prompt"),
    threshold: doublePrecision("threshold"),
    maskThreshold: doublePrecision("mask_threshold"),
    totalItems: integer("total_items").default(0).notNull(),
    queuedItems: integer("queued_items").default(0).notNull(),
    processingItems: integer("processing_items").default(0).notNull(),
    successItems: integer("success_items").default(0).notNull(),
    failedItems: integer("failed_items").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("request_batch_job_user_id_idx").on(table.userId),
    index("request_batch_job_user_id_job_id_idx").on(table.userId, table.id),
    index("request_batch_job_status_idx").on(table.status),
  ],
);
export type RequestBatchJob = InferSelectModel<typeof requestBatchJob>;

export const requestBatchItem = pgTable(
  "request_batch_item",
  {
    jobId: text("job_id")
      .notNull()
      .references(() => requestBatchJob.id, { onDelete: "cascade" }),
    itemIndex: integer("item_index").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    inputS3Key: text("input_s3_key").notNull(),
    status: requestBatchItemStatusEnum("status").default("queued").notNull(),
    outputPrefix: text("output_prefix"),
    outputCount: integer("output_count").default(0).notNull(),
    masksJson: jsonb("masks_json"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.jobId, table.itemIndex], name: "request_batch_item_pk" }),
    index("request_batch_item_user_id_job_id_idx").on(table.userId, table.jobId),
    index("request_batch_item_job_id_idx").on(table.jobId),
    index("request_batch_item_status_idx").on(table.status),
  ],
);
export type RequestBatchItem = InferSelectModel<typeof requestBatchItem>;

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  jobs: many(requestJob),
  batchJobs: many(requestBatchJob),
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
}));

export const creditPurchaseRelations = relations(creditPurchase, ({ one }) => ({
  user: one(user, {
    fields: [creditPurchase.userId],
    references: [user.id],
  }),
}));

export const requestJobRelations = relations(requestJob, ({ one }) => ({
  apiKey: one(apiKey, {
    fields: [requestJob.apiKeyId],
    references: [apiKey.id],
  }),
  user: one(user, {
    fields: [requestJob.userId],
    references: [user.id],
  }),
}));

export const requestBatchJobRelations = relations(requestBatchJob, ({ many, one }) => ({
  apiKey: one(apiKey, {
    fields: [requestBatchJob.apiKeyId],
    references: [apiKey.id],
  }),
  items: many(requestBatchItem),
  user: one(user, {
    fields: [requestBatchJob.userId],
    references: [user.id],
  }),
}));

export const requestBatchItemRelations = relations(requestBatchItem, ({ one }) => ({
  job: one(requestBatchJob, {
    fields: [requestBatchItem.jobId],
    references: [requestBatchJob.id],
  }),
  user: one(user, {
    fields: [requestBatchItem.userId],
    references: [user.id],
  }),
}));
