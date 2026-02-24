import { relations, sql, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  check,
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
export const jobStatusEnum = pgEnum("job_status", ["queued", "processing", "success", "failed"]);
export const jobModalityEnum = pgEnum("job_modality", ["image", "video"]);
export const batchJobStatusEnum = pgEnum("batch_job_status", [
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
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

// ── Image ───────────────────────────────────────────────────────────────────────

export const image = pgTable(
  "image",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    s3Path: text("s3_path").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("image_user_id_s3_path_uidx").on(table.userId, table.s3Path),
    index("image_user_id_idx").on(table.userId),
  ],
);
export type Image = InferSelectModel<typeof image>;

// ── Video Asset ────────────────────────────────────────────────────────────────

export const videoAsset = pgTable(
  "video_asset",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    s3Path: text("s3_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("video_asset_user_id_s3_path_uidx").on(table.userId, table.s3Path),
    index("video_asset_user_id_idx").on(table.userId),
  ],
);
export type VideoAsset = InferSelectModel<typeof videoAsset>;

// ── Batch Job ───────────────────────────────────────────────────────────────────

export const batchJob = pgTable(
  "batch_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    prompts: text("prompts").array().notNull(),
    status: batchJobStatusEnum("status").default("queued").notNull(),
    totalItems: integer("total_items").default(0).notNull(),
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
    index("batch_job_user_id_idx").on(table.userId),
    index("batch_job_status_idx").on(table.status),
  ],
);
export type BatchJob = InferSelectModel<typeof batchJob>;

// ── Job ─────────────────────────────────────────────────────────────────────────

export const job = pgTable(
  "job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => apiKey.id, { onDelete: "set null" }),
    batchJobId: text("batch_job_id").references(() => batchJob.id, { onDelete: "cascade" }),
    modality: jobModalityEnum("modality").default("image").notNull(),
    inputImageId: text("input_image_id").references(() => image.id, { onDelete: "cascade" }),
    inputVideoId: text("input_video_id").references(() => videoAsset.id, { onDelete: "cascade" }),
    prompts: text("prompts").array().notNull(),
    status: jobStatusEnum("status").default("queued").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("job_user_id_idx").on(table.userId),
    index("job_batch_job_id_idx").on(table.batchJobId),
    index("job_modality_idx").on(table.modality),
    index("job_status_idx").on(table.status),
    check(
      "job_modality_input_check",
      sql`(
        (${table.modality} = 'image' AND ${table.inputImageId} IS NOT NULL AND ${table.inputVideoId} IS NULL)
        OR
        (${table.modality} = 'video' AND ${table.inputVideoId} IS NOT NULL AND ${table.inputImageId} IS NULL)
      )`,
    ),
  ],
);
export type Job = InferSelectModel<typeof job>;

// ── Job Output Mask ─────────────────────────────────────────────────────────────

export const jobOutputMask = pgTable(
  "job_output_mask",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    maskIndex: integer("mask_index").notNull(),
    s3Path: text("s3_path").notNull(),
    score: doublePrecision("score"),
    box: jsonb("box").$type<[number, number, number, number]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("job_output_mask_job_id_idx").on(table.jobId),
  ],
);
export type JobOutputMask = InferSelectModel<typeof jobOutputMask>;

// ── Job Video Output ────────────────────────────────────────────────────────────

export const jobVideoOutput = pgTable(
  "job_video_output",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    manifestUrl: text("manifest_url").notNull(),
    framesUrl: text("frames_url").notNull(),
    outputS3Prefix: text("output_s3_prefix").notNull(),
    maskEncoding: text("mask_encoding").notNull(),
    framesProcessed: integer("frames_processed").notNull(),
    framesWithMasks: integer("frames_with_masks").notNull(),
    totalMasks: integer("total_masks").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("job_video_output_job_id_uidx").on(table.jobId),
  ],
);
export type JobVideoOutput = InferSelectModel<typeof jobVideoOutput>;

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
    latestBatchJobId: text("latest_batch_job_id").references(() => batchJob.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("auto_label_project_user_id_idx").on(table.userId),
    index("auto_label_project_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
    index("auto_label_project_latest_batch_job_id_idx").on(table.latestBatchJobId),
  ],
);
export type AutoLabelProject = InferSelectModel<typeof autoLabelProject>;

// ── Auto-Label Project ↔ Image (junction) ───────────────────────────────────────

export const autoLabelProjectImage = pgTable(
  "auto_label_project_image",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => autoLabelProject.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => image.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.imageId], name: "auto_label_project_image_pk" }),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────────

export const apiKeyRelations = relations(apiKey, ({ one, many }) => ({
  user: one(user, { fields: [apiKey.userId], references: [user.id] }),
  jobs: many(job),
  batchJobs: many(batchJob),
}));

export const creditPurchaseRelations = relations(creditPurchase, ({ one }) => ({
  user: one(user, { fields: [creditPurchase.userId], references: [user.id] }),
}));

export const imageRelations = relations(image, ({ one, many }) => ({
  user: one(user, { fields: [image.userId], references: [user.id] }),
  jobs: many(job),
  projectLinks: many(autoLabelProjectImage),
}));

export const videoAssetRelations = relations(videoAsset, ({ one, many }) => ({
  user: one(user, { fields: [videoAsset.userId], references: [user.id] }),
  jobs: many(job),
}));

export const batchJobRelations = relations(batchJob, ({ one, many }) => ({
  user: one(user, { fields: [batchJob.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [batchJob.apiKeyId], references: [apiKey.id] }),
  jobs: many(job),
}));

export const jobRelations = relations(job, ({ one, many }) => ({
  user: one(user, { fields: [job.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [job.apiKeyId], references: [apiKey.id] }),
  batchJob: one(batchJob, { fields: [job.batchJobId], references: [batchJob.id] }),
  inputImage: one(image, { fields: [job.inputImageId], references: [image.id] }),
  inputVideo: one(videoAsset, { fields: [job.inputVideoId], references: [videoAsset.id] }),
  outputMasks: many(jobOutputMask),
  videoOutput: one(jobVideoOutput, { fields: [job.id], references: [jobVideoOutput.jobId] }),
}));

export const jobOutputMaskRelations = relations(jobOutputMask, ({ one }) => ({
  job: one(job, { fields: [jobOutputMask.jobId], references: [job.id] }),
}));

export const jobVideoOutputRelations = relations(jobVideoOutput, ({ one }) => ({
  job: one(job, { fields: [jobVideoOutput.jobId], references: [job.id] }),
}));

export const autoLabelProjectRelations = relations(autoLabelProject, ({ one, many }) => ({
  user: one(user, { fields: [autoLabelProject.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [autoLabelProject.apiKeyId], references: [apiKey.id] }),
  latestBatchJob: one(batchJob, { fields: [autoLabelProject.latestBatchJobId], references: [batchJob.id] }),
  imageLinks: many(autoLabelProjectImage),
}));

export const autoLabelProjectImageRelations = relations(autoLabelProjectImage, ({ one }) => ({
  project: one(autoLabelProject, { fields: [autoLabelProjectImage.projectId], references: [autoLabelProject.id] }),
  image: one(image, { fields: [autoLabelProjectImage.imageId], references: [image.id] }),
}));
