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

// ── Enums ───────────────────────────────────────────────────────────────────────

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "failed"]);
export const segAssetTypeEnum = pgEnum("seg_asset_type", ["image", "video"]);
export const segRequestTypeEnum = pgEnum("seg_request_type", [
  "image_sync",
  "image_batch",
  "video",
]);
export const segRequestStatusEnum = pgEnum("seg_request_status", [
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);
export const segTaskTypeEnum = pgEnum("seg_task_type", ["image", "video"]);
export const segTaskStatusEnum = pgEnum("seg_task_status", [
  "queued",
  "processing",
  "success",
  "failed",
]);

// ── API Key ─────────────────────────────────────────────────────────────────────

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

// ── Credit Purchase ─────────────────────────────────────────────────────────────

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

// ── Segmentation Asset ─────────────────────────────────────────────────────────

export const segAsset = pgTable(
  "seg_asset",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assetType: segAssetTypeEnum("asset_type").notNull(),
    s3Path: text("s3_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seg_asset_user_id_s3_path_uidx").on(table.userId, table.s3Path),
    index("seg_asset_user_id_idx").on(table.userId),
    index("seg_asset_type_idx").on(table.assetType),
  ],
);
export type SegAsset = InferSelectModel<typeof segAsset>;

// ── Segmentation Request ───────────────────────────────────────────────────────

export const segRequest = pgTable(
  "seg_request",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    requestType: segRequestTypeEnum("request_type").notNull(),
    prompts: text("prompts").array().notNull(),
    status: segRequestStatusEnum("status").default("queued").notNull(),
    totalTasks: integer("total_tasks").default(0).notNull(),
    queuedTasks: integer("queued_tasks").default(0).notNull(),
    processingTasks: integer("processing_tasks").default(0).notNull(),
    successTasks: integer("success_tasks").default(0).notNull(),
    failedTasks: integer("failed_tasks").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("seg_request_user_id_idx").on(table.userId),
    index("seg_request_status_idx").on(table.status),
    index("seg_request_type_idx").on(table.requestType),
  ],
);
export type SegRequest = InferSelectModel<typeof segRequest>;

// ── Segmentation Task ──────────────────────────────────────────────────────────

export const segTask = pgTable(
  "seg_task",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => segRequest.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taskType: segTaskTypeEnum("task_type").notNull(),
    status: segTaskStatusEnum("status").default("queued").notNull(),
    inputAssetId: text("input_asset_id")
      .notNull()
      .references(() => segAsset.id, { onDelete: "cascade" }),
    threshold: doublePrecision("threshold"),
    maskThreshold: doublePrecision("mask_threshold"),
    videoParams: jsonb("video_params"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("seg_task_request_id_idx").on(table.requestId),
    index("seg_task_user_id_idx").on(table.userId),
    index("seg_task_status_idx").on(table.status),
    index("seg_task_type_idx").on(table.taskType),
  ],
);
export type SegTask = InferSelectModel<typeof segTask>;

// ── Segmentation Task Masks ────────────────────────────────────────────────────

export const segTaskMask = pgTable(
  "seg_task_mask",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => segTask.id, { onDelete: "cascade" }),
    maskIndex: integer("mask_index").notNull(),
    s3Path: text("s3_path").notNull(),
    score: doublePrecision("score"),
    box: jsonb("box").$type<[number, number, number, number]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("seg_task_mask_task_id_idx").on(table.taskId)],
);
export type SegTaskMask = InferSelectModel<typeof segTaskMask>;

// ── Segmentation Task Video Output ─────────────────────────────────────────────

export const segTaskVideoOutput = pgTable(
  "seg_task_video_output",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => segTask.id, { onDelete: "cascade" }),
    manifestUrl: text("manifest_url").notNull(),
    framesUrl: text("frames_url").notNull(),
    outputS3Prefix: text("output_s3_prefix").notNull(),
    maskEncoding: text("mask_encoding").notNull(),
    framesProcessed: integer("frames_processed").notNull(),
    framesWithMasks: integer("frames_with_masks").notNull(),
    totalMasks: integer("total_masks").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("seg_task_video_output_task_id_uidx").on(table.taskId)],
);
export type SegTaskVideoOutput = InferSelectModel<typeof segTaskVideoOutput>;

// ── Auto-Label Project ──────────────────────────────────────────────────────────

export const autoLabelProject = pgTable(
  "auto_label_project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    prompts: text("prompts").array().notNull(),
    threshold: doublePrecision("threshold").default(0.5).notNull(),
    maskThreshold: doublePrecision("mask_threshold").default(0.5).notNull(),
    latestRequestId: text("latest_request_id").references(() => segRequest.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("auto_label_project_user_id_idx").on(table.userId),
    index("auto_label_project_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
    index("auto_label_project_latest_request_id_idx").on(table.latestRequestId),
  ],
);
export type AutoLabelProject = InferSelectModel<typeof autoLabelProject>;

// ── Auto-Label Project ↔ Asset (junction) ─────────────────────────────────────

export const autoLabelProjectImage = pgTable(
  "auto_label_project_image",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => autoLabelProject.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => segAsset.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.imageId], name: "auto_label_project_image_pk" }),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────────

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  user: one(user, { fields: [apiKey.userId], references: [user.id] }),
  requests: many(segRequest),
}));

export const creditPurchaseRelations = relations(creditPurchase, ({ one }) => ({
  user: one(user, { fields: [creditPurchase.userId], references: [user.id] }),
}));

export const segAssetRelations = relations(segAsset, ({ one, many }) => ({
  user: one(user, { fields: [segAsset.userId], references: [user.id] }),
  tasks: many(segTask),
  projectLinks: many(autoLabelProjectImage),
}));

export const segRequestRelations = relations(segRequest, ({ one, many }) => ({
  user: one(user, { fields: [segRequest.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [segRequest.apiKeyId], references: [apiKey.id] }),
  tasks: many(segTask),
  autoLabelProjects: many(autoLabelProject),
}));

export const segTaskRelations = relations(segTask, ({ one, many }) => ({
  request: one(segRequest, { fields: [segTask.requestId], references: [segRequest.id] }),
  user: one(user, { fields: [segTask.userId], references: [user.id] }),
  inputAsset: one(segAsset, { fields: [segTask.inputAssetId], references: [segAsset.id] }),
  masks: many(segTaskMask),
  videoOutput: one(segTaskVideoOutput, {
    fields: [segTask.id],
    references: [segTaskVideoOutput.taskId],
  }),
}));

export const segTaskMaskRelations = relations(segTaskMask, ({ one }) => ({
  task: one(segTask, { fields: [segTaskMask.taskId], references: [segTask.id] }),
}));

export const segTaskVideoOutputRelations = relations(segTaskVideoOutput, ({ one }) => ({
  task: one(segTask, { fields: [segTaskVideoOutput.taskId], references: [segTask.id] }),
}));

export const autoLabelProjectRelations = relations(autoLabelProject, ({ one, many }) => ({
  user: one(user, { fields: [autoLabelProject.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [autoLabelProject.apiKeyId], references: [apiKey.id] }),
  latestRequest: one(segRequest, {
    fields: [autoLabelProject.latestRequestId],
    references: [segRequest.id],
  }),
  imageLinks: many(autoLabelProjectImage),
}));

export const autoLabelProjectImageRelations = relations(autoLabelProjectImage, ({ one }) => ({
  project: one(autoLabelProject, {
    fields: [autoLabelProjectImage.projectId],
    references: [autoLabelProject.id],
  }),
  asset: one(segAsset, { fields: [autoLabelProjectImage.imageId], references: [segAsset.id] }),
}));
