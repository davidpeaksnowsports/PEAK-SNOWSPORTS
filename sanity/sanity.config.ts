import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes, singletonTypes, singletonIds } from './schemas';

export default defineConfig({
  name: 'peaksnowsports',
  title: 'Peak Snowsports',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'un1s8qq9',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singletons surface as a single editable document (not a list).
            S.listItem()
              .title('Lessons page')
              .id('lessonsPage')
              .child(
                S.document().schemaType('lessonsPage').documentId(singletonIds.lessonsPage),
              ),
            S.listItem()
              .title('Ski camps page')
              .id('skiCampsPage')
              .child(
                S.document().schemaType('skiCampsPage').documentId(singletonIds.skiCampsPage),
              ),
            S.listItem()
              .title('Site settings')
              .id('settings')
              .child(S.document().schemaType('settings').documentId(singletonIds.settings)),
            S.divider(),
            // Everything else as standard document lists.
            ...S.documentTypeListItems().filter(
              (item) => !singletonTypes.has(item.getId() ?? ''),
            ),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    // Hide singleton document types from the default "new document" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    // Prevent duplicating or deleting singleton documents.
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(({ action }) => !['duplicate', 'delete'].includes(action ?? ''))
        : input,
  },
});
