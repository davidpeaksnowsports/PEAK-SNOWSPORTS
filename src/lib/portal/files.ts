/**
 * Files instructors can download.
 *
 * A short list in code rather than a table: these are added by an admin with a
 * deploy anyway, and a table would be another surface to get the permissions
 * right on. The bucket is private and the route signs each request, so this
 * list is a map of slugs to paths, not an access control.
 *
 * To add one: put the file in the `portal-files` bucket and add a line here.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/portal/upload-file.mjs <local-file> <path-in-bucket>
 */
export interface PortalFile {
  slug: string;
  title: string;
  description: string;
  /** Path inside the private `portal-files` bucket. */
  path: string;
  /** What the browser should call it when it lands in Downloads. */
  filename: string;
  /** Which hub section lists it. */
  section: 'hr' | 'ops' | 'knowledge' | 'handbook' | 'development' | 'marketing';
}

export const PORTAL_FILES: PortalFile[] = [
  {
    slug: 'invoice-template',
    title: 'Invoice template',
    description:
      'A blank invoice to fill in and send to finance. Replace everything in square brackets with your own details.',
    path: 'templates/Peak-instructor-invoice-template.docx',
    filename: 'Peak-instructor-invoice-template.docx',
    section: 'hr',
  },
];

export const filesForSection = (section: string) =>
  PORTAL_FILES.filter((f) => f.section === section);

export const fileBySlug = (slug: string) =>
  PORTAL_FILES.find((f) => f.slug === slug) ?? null;
