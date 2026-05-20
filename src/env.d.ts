/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SANITY_PROJECT_ID: string;
  readonly PUBLIC_SANITY_DATASET: string;
  readonly PUBLIC_SANITY_API_VERSION: string;
  readonly SANITY_READ_TOKEN: string;
  readonly ARCH_BOOKING_URL: string;
  readonly ARCH_SECURE_API_KEY: string;
  readonly SITE_URL: string;
  readonly RESEND_API_KEY: string;
  readonly PUBLIC_FORMSPREE_ENDPOINT: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN: string;
  readonly PUBLIC_WEGLOT_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
