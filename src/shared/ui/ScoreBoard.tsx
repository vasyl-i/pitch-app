import type { PropsWithChildren } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { accentAlpha, spacing } from '@/shared/theme';

/** phones shorter than this get the smaller mascot (iPhone SE, mini) */
export const COMPACT_SCREEN = Dimensions.get('screen').height < 700;

/**
 * The results mascot holding up its board, with the result written on the
 * board (children, centred) and, for a good result, a soft accent glow
 * behind it. One drawing for every result screen, sized down on short phones.
 */
export function ScoreBoard({ success, children }: PropsWithChildren<{ success: boolean }>) {
  return (
    <View style={styles.frame}>
      <Image source={require('../../../assets/Score.png')} style={COMPACT_SCREEN ? styles.mascotSmall : styles.mascot} resizeMode="contain" />
      {success && (
        <Image
          source={require('../../../assets/results-board-overlay.png')}
          style={COMPACT_SCREEN ? styles.glowSmall : styles.glow}
          resizeMode="contain"
          tintColor={accentAlpha(0.05)}
        />
      )}
      <View style={styles.board}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', alignItems: 'center' },
  mascot: { width: 320, height: 328, marginHorizontal: 55 },
  mascotSmall: { width: 220, height: 226, marginHorizontal: 55 },
  // the glow sits on the board, 130 pt into the full-size mascot
  glow: { position: 'absolute', top: 130, alignSelf: 'center', marginLeft: -6 },
  // …and scales with the small one (220/320)
  glowSmall: { position: 'absolute', top: 89, width: 195, height: 116, alignSelf: 'center', marginLeft: -4 },
  // the board's face, below the mascot's head
  board: {
    ...StyleSheet.absoluteFill,
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
