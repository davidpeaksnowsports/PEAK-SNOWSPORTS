import resort from './resort';
import lesson from './lesson';
import instructor from './instructor';
import post from './post';
import testimonial from './testimonial';
import settings from './settings';
import skiCamp from './skiCamp';
import campLocation from './campLocation';
import skiCampsPage from './skiCampsPage';
import lessonsPage from './lessonsPage';

export const schemaTypes = [
  resort,
  lesson,
  instructor,
  post,
  testimonial,
  settings,
  skiCamp,
  campLocation,
  skiCampsPage,
  lessonsPage,
];

// Singleton document ids — exactly one of each should exist.
// Studio structure enforces this; seed script writes with these fixed ids.
export const singletonTypes = new Set<string>(['settings', 'skiCampsPage', 'lessonsPage']);
export const singletonIds: Record<string, string> = {
  settings: 'settings',
  skiCampsPage: 'skiCampsPage',
  lessonsPage: 'lessonsPage',
};
