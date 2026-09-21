/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SANITY_PROJECT_ID: string;
  readonly PUBLIC_SANITY_DATASET: string;
  readonly PUBLIC_SANITY_API_VERSION: string;
  readonly SANITY_READ_TOKEN: string;
  readonly RESEND_API_KEY: string;
  readonly PUBLIC_FORMSPREE_ENDPOINT: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN: string;
  readonly PUBLIC_META_PIXEL_ID: string;
  readonly PUBLIC_GOOGLE_ADS_ID: string;
  readonly PUBLIC_WEGLOT_API_KEY: string;

  // --- Instructor portal --------------------------------------------------
  // No PUBLIC_ prefix on any of these: the portal is server-rendered and none
  // of its credentials reach the browser.
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  /** Private Sanity dataset holding portal documents. Never the public one. */
  readonly SANITY_PORTAL_DATASET: string;
  /** Read token for the private dataset. */
  readonly SANITY_PORTAL_TOKEN: string;

  // --- GAP student portal -------------------------------------------------
  // Shares SUPABASE_URL / SUPABASE_ANON_KEY above. Only the notification
  // recipients are its own.
  /** Where support requests and course feedback are emailed. */
  readonly GAP_SUPPORT_TO: string;
  /** From address for portal notifications. Must be Resend-verified. */
  readonly GAP_SUPPORT_FROM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /** Set by middleware on /portal routes. Null when signed out. */
    portalUser: import('./lib/portal/supabase').PortalUser | null;
    /**
     * Set by middleware on /gap routes. Null when signed out — and always null
     * on /portal routes, so a page cannot read the wrong area's user.
     */
    gapUser: import('./lib/gap/supabase').GapUser | null;
    /** Set by middleware on /hq routes. Null when signed out or not staff. */
    hqUser: import('./lib/hq/supabase').HqUser | null;
  }
}
