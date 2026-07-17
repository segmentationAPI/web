import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { marketingUrl } from "./src/lib/site";

export default defineConfig({
  output: "static",
  site: marketingUrl,
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.endsWith("/404/") })],
  vite: {
    plugins: [tailwindcss()],
  },
});
