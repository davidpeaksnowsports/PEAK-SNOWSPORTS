/**
 * Who does what at Peak, for the People section of HQ.
 *
 * The role map follows David's Basecamp framework (October 2026): the roles
 * that have moved off the Syndicate Lead, who holds them, and how they hand
 * work to each other. Pay and Basecamp deliberations are deliberately not
 * here; this is what everyone in HQ needs to know to get work to the right
 * person.
 *
 * `jd` is the slug of the role's job description in the People section, if
 * there is one. The page links it only when that document exists.
 */

export type RoleKey =
  | 'syndicate'
  | 'basecamp'
  | 'ops'
  | 'marketing'
  | 'booking'
  | 'instructors'
  | 'content';

export interface Role {
  key: RoleKey;
  title: string;
  holder: string;
  summary: string;
  jd?: string;
}

export const ROLES: Role[] = [
  {
    key: 'syndicate',
    title: 'Syndicate Lead',
    holder: 'David',
    summary: 'Strategy, revenue, partnerships, finance and compliance.',
  },
  {
    key: 'basecamp',
    title: 'Basecamp',
    holder: 'Senior instructors',
    summary: 'Votes on the big decisions: pay, senior hires, deals over €2,000, new products.',
  },
  {
    key: 'ops',
    title: 'Operations Lead',
    holder: 'Marc',
    summary: 'Scheduling, allocation and delivery. The booking team. Budget, books and instructor pay.',
    jd: 'jd-operations-lead',
  },
  {
    key: 'marketing',
    title: 'Marketing and Brand Lead',
    holder: 'George',
    summary: 'Positioning, campaigns, social, events and partner activation.',
    jd: 'jd-marketing-brand-lead',
  },
  {
    key: 'booking',
    title: 'Booking specialists',
    holder: 'Margaux and Ségolène',
    summary: 'Answer enquiries, quote, book, take payment, look after the customer.',
    jd: 'jd-booking-specialist',
  },
  {
    key: 'instructors',
    title: 'Instructors',
    holder: 'The teaching team',
    summary: 'Teach every lesson, camp and course. Self-employed.',
    jd: 'jd-ski-instructor',
  },
  {
    key: 'content',
    title: 'Content creator',
    holder: 'Mariusz',
    summary: 'Photo, video and social content, briefed by Marketing.',
  },
];

/** How the roles hand work to each other. `from` does `label` for `to`. */
export const LINKS: { from: RoleKey; to: RoleKey; label: string; short: string }[] = [
  { from: 'syndicate', to: 'basecamp', label: 'Brings big decisions to a vote', short: 'big decisions' },
  { from: 'syndicate', to: 'ops', label: 'Signs off spending above the agreed amount', short: 'budget sign-off' },
  { from: 'syndicate', to: 'marketing', label: 'Signs partner deals for Marketing to activate', short: 'partner deals' },
  { from: 'marketing', to: 'ops', label: 'Asks for booking team time', short: 'booking team time' },
  { from: 'ops', to: 'booking', label: 'Briefs, oversees and sets the rota', short: 'briefs, rota' },
  { from: 'ops', to: 'instructors', label: 'Allocates lessons and runs pay', short: 'allocation, pay' },
  { from: 'booking', to: 'instructors', label: 'Creates the bookings they teach', short: 'bookings' },
  { from: 'marketing', to: 'content', label: 'Briefs and oversees', short: 'briefs' },
];

export const roleByKey = (k: RoleKey) => ROLES.find((r) => r.key === k)!;
