/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MARKETING_URL?: string;
  readonly PUBLIC_APP_URL?: string;
  readonly PUBLIC_CF_WEB_ANALYTICS_TOKEN?: string;
  readonly CF_PAGES_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
