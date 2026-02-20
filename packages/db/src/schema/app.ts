import { relations, type InferSelectModel } from "drizzle-orm";
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

// ─── Auto-labeling ────────────────────────────────────────────────────────────

export const labelProjectStatusEnum = pgEnum("label_project_status", [
  "draft",
  "ready",
  "processing",
  "completed",
  "failed",
]);

export const labelProject = pgTable(
  "label_project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    apiKeyPlaintext: text("api_key_plaintext").notNull().default(""),
    prompt: text("prompt").notNull(),
    status: labelProjectStatusEnum("status").default("draft").notNull(),
    outputCoco: boolean("output_coco").default(true).notNull(),
    outputClassPngs: boolean("output_class_pngs").default(false).notNull(),
    outputYolo: boolean("output_yolo").default(false).notNull(),
    totalImages: integer("total_images").default(0).notNull(),
    processedImages: integer("processed_images").default(0).notNull(),
    failedImages: integer("failed_images").default(0).notNull(),
    resultKey: text("result_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("label_project_user_id_idx").on(table.userId),
    index("label_project_status_idx").on(table.status),
  ],
);
export type LabelProject = InferSelectModel<typeof labelProject>;

export const labelImage = pgTable(
  "label_image",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => labelProject.id, { onDelete: "cascade" }),
    s3Key: text("s3_key").notNull(),
    originalName: text("original_name").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    imageStatus: text("image_status").default("pending").notNull(), // pending | processing | done | failed
    errorMessage: text("error_message"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("label_image_project_id_idx").on(table.projectId),
    index("label_image_status_idx").on(table.imageStatus),
  ],
);
export type LabelImage = InferSelectModel<typeof labelImage>;

export const labelProjectRelations = relations(labelProject, ({ one, many }) => ({
  user: one(user, {
    fields: [labelProject.userId],
    references: [user.id],
  }),
  apiKey: one(apiKey, {
    fields: [labelProject.apiKeyId],
    references: [apiKey.id],
  }),
  images: many(labelImage),
}));

export const labelImageRelations = relations(labelImage, ({ one }) => ({
  project: one(labelProject, {
    fields: [labelImage.projectId],
    references: [labelProject.id],
  }),
}));
