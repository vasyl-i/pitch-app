/**
 * Monetization analytics: the event contract, and a pluggable sink.
 *
 * Kept separate from both the store and the UI on purpose. Conversion work is
 * relentless experimentation — which lock drove the upgrade, which plan was
 * selected, where people bounce — and that question is asked far more often
 * than the subscription logic changes. Screens emit intent; where it goes is
 * decided once, here.
 *
 * No sink is installed by default, so nothing leaves the device until a real
 * analytics provider is wired in deliberately. Events carry only feature names
 * and plan ids — never audio, never anything about the user's voice.
 */
import type { PlanId, PremiumFeature } from '../model/types';

/** where a paywall was opened from — the key attribution dimension */
export type PaywallSource =
  | 'today-adaptive-lesson'
  | 'today-coach-card'
  | 'weak-spots'
  | 'session-feedback'
  | 'attempt-comparison'
  | 'performance-overlay'
  | 'practice-library'
  | 'progress-mastery'
  | 'profile'
  | 'instrumental-upload'
  | 'unknown';

export type MonetizationEvent =
  /** a locked surface was rendered to a free user */
  | { type: 'gate_viewed'; feature: PremiumFeature; source: PaywallSource }
  /** a free user tapped a locked surface */
  | { type: 'gate_tapped'; feature: PremiumFeature; source: PaywallSource }
  | { type: 'paywall_viewed'; source: PaywallSource; trialEligible: boolean }
  | { type: 'paywall_plan_selected'; source: PaywallSource; planId: PlanId }
  | { type: 'paywall_dismissed'; source: PaywallSource }
  | { type: 'purchase_started'; source: PaywallSource; planId: PlanId; withTrial: boolean }
  | { type: 'purchase_completed'; source: PaywallSource; planId: PlanId; withTrial: boolean }
  | { type: 'purchase_cancelled'; source: PaywallSource; planId: PlanId }
  | { type: 'purchase_failed'; source: PaywallSource; planId: PlanId; message: string }
  | { type: 'restore_started' }
  | { type: 'restore_completed'; planId: PlanId | null }
  | { type: 'restore_failed'; message: string };

export type MonetizationSink = (event: MonetizationEvent, at: number) => void;

let sink: MonetizationSink | null = null;

/** install the real provider once at app start; call with null to detach */
export function setMonetizationSink(next: MonetizationSink | null): void {
  sink = next;
}

/**
 * Emit an event. Never throws: a broken analytics provider must not be able
 * to take down a purchase flow.
 */
export function trackMonetization(event: MonetizationEvent, at: number = Date.now()): void {
  if (!sink) return;
  try {
    sink(event, at);
  } catch {
    // analytics is strictly best-effort
  }
}
