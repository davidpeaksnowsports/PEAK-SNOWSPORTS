import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'un1s8qq9',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // Studio hostname: https://peaksnowsports.sanity.studio
  studioHost: 'peaksnowsports',
  deployment: {
    appId: 'on1ztz51wsjbiriefdf6waap',
  },
});
