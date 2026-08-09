/**
 * Declarative feature gating.
 *
 * ```tsx
 * <PremiumGate
 *   feature="attempt-comparison"
 *   source="attempt-comparison"
 *   locked={{ title: 'Assisted vs. independent', description: '…' }}
 * >
 *   <ComparisonCard … />
 * </PremiumGate>
 * ```
 *
 * The entitled branch is a normal child, so the premium component is written
 * once and unaware it was ever gated. Gate impressions are tracked here, which
 * is what makes "which lock actually converts?" answerable without every
 * screen remembering to log.
 */
import { useEffect, type ReactNode } from 'react';
import { trackMonetization, type PaywallSource } from '../lib/analytics';
import { useEntitlement } from '../model/useEntitlement';
import { usePaywall } from '../model/usePaywall';
import type { PremiumFeature } from '../model/types';
import { LockedFeatureCard } from './LockedFeatureCard';

type LockedCopy = Omit<Parameters<typeof LockedFeatureCard>[0], 'onPress'>;

interface PremiumGateProps {
  feature: PremiumFeature;
  source: PaywallSource;
  children: ReactNode;
  /** copy for the default locked card; ignored when `fallback` is given */
  locked?: LockedCopy;
  /** full control over the locked branch — receives the paywall opener */
  fallback?: (openPaywall: () => void) => ReactNode;
  /** render nothing at all when locked (for surfaces with no room to tease) */
  hideWhenLocked?: boolean;
}

export function PremiumGate({
  feature,
  source,
  children,
  locked,
  fallback,
  hideWhenLocked = false,
}: PremiumGateProps) {
  const unlocked = useEntitlement(feature);
  const openPaywall = usePaywall(source, feature);

  useEffect(() => {
    if (!unlocked && !hideWhenLocked) trackMonetization({ type: 'gate_viewed', feature, source });
  }, [unlocked, hideWhenLocked, feature, source]);

  if (unlocked) return <>{children}</>;
  if (hideWhenLocked) return null;
  if (fallback) return <>{fallback(openPaywall)}</>;
  if (locked) return <LockedFeatureCard {...locked} onPress={openPaywall} />;
  return null;
}
