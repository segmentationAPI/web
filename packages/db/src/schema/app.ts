import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "failed"]);
export const jobStatusEnum = pgEnum("job_status", ["success", "failed"]);

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
    tokenCost: integer("token_cost").default(0).notNull(),
    inputBucket: text("input_bucket"),
    inputKey: text("input_key"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("request_job_request_id_uidx").on(table.requestId),
    index("request_job_user_id_idx").on(table.userId),
    index("request_job_processed_at_idx").on(table.processedAt),
    index("request_job_status_idx").on(table.status),
  ],
);

export const requestJobOutput = pgTable(
  "request_job_output",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => requestJob.id, { onDelete: "cascade" }),
    outputIndex: integer("output_index").notNull(),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("request_job_output_job_index_uidx").on(table.jobId, table.outputIndex),
    index("request_job_output_job_id_idx").on(table.jobId),
  ],
);

export const workerEventReceipt = pgTable(
  "worker_event_receipt",
  {
    eventId: text("event_id").primaryKey(),
    jobId: text("job_id").references(() => requestJob.id, { onDelete: "set null" }),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => [index("worker_event_receipt_job_id_idx").on(table.jobId)],
);

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  jobs: many(requestJob),
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

export const requestJobRelations = relations(requestJob, ({ one, many }) => ({
  apiKey: one(apiKey, {
    fields: [requestJob.apiKeyId],
    references: [apiKey.id],
  }),
  outputs: many(requestJobOutput),
  user: one(user, {
    fields: [requestJob.userId],
    references: [user.id],
  }),
}));

export const requestJobOutputRelations = relations(requestJobOutput, ({ one }) => ({
  job: one(requestJob, {
    fields: [requestJobOutput.jobId],
    references: [requestJob.id],
  }),
}));
