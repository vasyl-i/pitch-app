import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
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
  const { typography, radii, spacing } = useTheme();

  return (
    <View style={[styles.root, { borderRadius: radii.lg + 4 }]}>
      <Image
        source={require('../../../../assets/focus-bg.png')}
        resizeMode="cover"
        style={{ position: 'absolute', top: 0, right: 0, height: HEIGHT, width: HEIGHT * BG_ASPECT }}
      />

      <View style={[styles.content, { padding: spacing.lg }]}>
        <AppText
          variant="caption"
          color="rgba(43,32,56,0.65)"
          style={{ fontFamily: typography.family.medium, letterSpacing: 0.2, fontSize: 13 }}
        >
          {eyebrow}
        </AppText>
        <AppText
          color={todayColor.inkOnBanner}
          style={{
            fontFamily: typography.family.bold,
            fontSize: 24,
            lineHeight: 30,
            letterSpacing: -0.3,
            marginTop: 8,
            maxWidth: '80%',
          }}
        >
          {title}
        </AppText>
        <AppText
          color="rgba(43,32,56,0.72)"
          style={{ fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: '72%' }}
        >
          {subcopy}
        </AppText>

        {footer && <View style={{ marginTop: spacing.md }}>{footer}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: HEIGHT, overflow: 'hidden' },
  content: { flex: 1, justifyContent: 'center' },
});
