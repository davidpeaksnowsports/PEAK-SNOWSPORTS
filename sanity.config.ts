import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './src/sanity/schemaTypes';
import { portalDoc } from './src/sanity/schemaTypes/portalDoc';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? 'un1s8qq9';

/**
 * Two workspaces, two datasets, deliberately separated.
 *
 * `production` is public-read: anything in it is fetchable by anyone holding
 * the project ID. `portal` is private and holds the instructor documents —
 * policies, pay rates, safeguarding. A portal document must never be created
 * in the production workspace, which is why they don't share a schema.
 *
 * The public site keeps /admin. The portal editor is at /admin/portal.
 */
export default defineConfig([
  {
    name: 'production',
    title: 'Peak Snowsports',
    basePath: '/admin',
    projectId,
    dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
    plugins: [structureTool(), visionTool()],
    schema: { types: schemaTypes },
  },
  {
    name: 'portal',
    title: 'Instructor portal',
    basePath: '/admin/portal',
    projectId,
    dataset: import.meta.env.SANITY_PORTAL_DATASET ?? 'portal',
    plugins: [structureTool()],
    schema: { types: [portalDoc] },
  },
]);
