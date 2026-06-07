import { post } from './post';
import { instructor } from './instructor';
import { accommodation } from './accommodation';
import { resort } from './resort';
import { lesson } from './lesson';
import { testimonial } from './testimonial';
import { settings } from './settings';

export const schemaTypes = [
  // Core content
  post,
  instructor,
  accommodation,
  // Supporting types (referenced by core content)
  resort,
  lesson,
  testimonial,
  // Singleton
  settings,
];
