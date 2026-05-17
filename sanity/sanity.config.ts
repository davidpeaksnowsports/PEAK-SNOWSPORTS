import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'peaksnowsports',
  title: 'Peak Snowsports',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-me',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
});
