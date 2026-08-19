/**
 * Paywall copy as data.
 *
 * The benefit list is shared by the paywall, the Profile upsell and any future
 * upgrade surface, so the promise stays identical everywhere — a paywall that
 * lists six things and a settings row that lists four is how support tickets
 * about "missing" features start.
 *
 * Each benefit names the `PremiumFeature` it corresponds to, which keeps the
 * marketing list and the entitlement matrix from drifting apart: a benefit we
 * advertise is one the app actually unlocks.
 */
import type { PremiumFeature } from './types';

export const PAYWALL_HEADLINE = 'Train smarter, not just longer.';

export const PAYWALL_SUBTITLE =
  'Your personal AI vocal coach analyzes every session and creates exercises tailored specifically to your voice.';

export interface PremiumBenefit {
  feature: PremiumFeature;
  title: string;
  /** the concrete version of the promise — what it looks like in practice */
  detail: string;
}

export const PREMIUM_BENEFITS: readonly PremiumBenefit[] = [
  {
    feature: 'ai-session-feedback',
    title: 'Personalized feedback',
    detail: 'After every session: what worked, what didn’t, and why — never generic praise.',
  },
  {
    feature: 'adaptive-lessons',
    title: 'Daily adaptive lessons',
    detail: 'A lesson rebuilt each morning from your own skill profile, evolving as you improve.',
  },
  {
    feature: 'smart-recommendations',
    title: 'Personified practice plans',
    detail: 'Exercises chosen from your history, each one explaining why it was picked.',
  },
  {
    feature: 'weak-spot-training',
    title: 'Weak spot training',
    detail: 'Drills generated from the exact intervals, notes and transitions you keep missing.',
  },
  {
    feature: 'attempt-comparison',
    title: 'Performance comparison',
    detail: 'See how you sing with the guide versus on your own — accuracy, stability and rhythm.',
  },
  {
    feature: 'advanced-library',
    title: 'Advanced exercises',
    detail: 'Modes, jazz arpeggios, chromatics, runs, belt and mix-voice work.',
  },
  {
    feature: 'unlimited-instrumental-uploads',
    title: 'Unlimited instrumentals',
    detail: 'Upload as many backing tracks as you like — free covers your first 3.',
  },
];
