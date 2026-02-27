import { relations, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("auto_label_project_user_id_idx").on(table.userId),
    index("auto_label_project_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
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
}));

export const creditPurchaseRelations = relations(creditPurchase, ({ one }) => ({
  user: one(user, { fields: [creditPurchase.userId], references: [user.id] }),
}));

export const segAssetRelations = relations(segAsset, ({ one, many }) => ({
  user: one(user, { fields: [segAsset.userId], references: [user.id] }),
  projectLinks: many(autoLabelProjectImage),
}));

export const autoLabelProjectRelations = relations(autoLabelProject, ({ one, many }) => ({
  user: one(user, { fields: [autoLabelProject.userId], references: [user.id] }),
  apiKey: one(apiKey, { fields: [autoLabelProject.apiKeyId], references: [apiKey.id] }),
  imageLinks: many(autoLabelProjectImage),
}));

export const autoLabelProjectImageRelations = relations(autoLabelProjectImage, ({ one }) => ({
  project: one(autoLabelProject, {
    fields: [autoLabelProjectImage.projectId],
    references: [autoLabelProject.id],
  }),
  asset: one(segAsset, { fields: [autoLabelProjectImage.imageId], references: [segAsset.id] }),
}));
