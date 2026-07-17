import { z } from "zod";

const urlSchema = z.url().transform((value) => value.replace(/\/$/, ""));

export const marketingUrl = urlSchema.parse(
  process.env.PUBLIC_MARKETING_URL ?? "https://www.segmentationapi.com",
);

export const appUrl = urlSchema.parse(
  process.env.PUBLIC_APP_URL ?? "https://app.segmentationapi.com",
);

export const isProductionDeployment =
  !process.env.CF_PAGES_BRANCH || process.env.CF_PAGES_BRANCH === "main";
