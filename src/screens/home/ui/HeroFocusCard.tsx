import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { radii, spacing } from '@/shared/theme';
import { todayColor } from '../todayPalette';

const HEIGHT = 180;
// focus-bg.png is 1218×540 — anchoring to the card's right edge at this
// aspect ratio keeps the artwork's light-ribbon accent (on its right side)
// always visible, cropping the left edge of the source instead of centering
// (center-crop was hiding the ribbon entirely on narrower cards).
const BG_ASPECT = 1218 / 540;

/**
 * This week's focus — the screen's visual centerpiece, and the one bright
 * surface on an otherwise dark page. Background is a supplied artwork
 * (violet-to-coral gradient with an organic light-ribbon accent on the
 * right), not a generated gradient. Dark ink instead of the page's usual
 * off-white, since it sits on a light surface. No border, no glass panel.
 */
export function HeroFocusCard({ eyebrow, title, subcopy, footer }: { eyebrow: string; title: string; subcopy: string; footer?: ReactNode }) {
  return (
    <View style={styles.root}>
      <Image source={require('../../../../assets/focus-bg.png')} resizeMode="cover" style={styles.artwork} />
      <View style={styles.content}>
        <AppText variant="small" weight="medium" color={todayColor.inkOnBannerMuted} style={styles.eyebrow}>
          {eyebrow}
        </AppText>
        <AppText variant="title" color={todayColor.inkOnBanner} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="small" color={todayColor.inkOnBannerMuted} style={styles.subcopy}>
          {subcopy}
        </AppText>
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: HEIGHT, overflow: 'hidden', borderRadius: radii.lg + 4 },
  artwork: { position: 'absolute', top: 0, right: 0, height: HEIGHT, width: HEIGHT * BG_ASPECT },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  eyebrow: { letterSpacing: 0.2 },
  title: { marginTop: spacing.sm, maxWidth: '80%' },
  subcopy: { marginTop: 6, maxWidth: '72%' },
  footer: { marginTop: spacing.md },
});
