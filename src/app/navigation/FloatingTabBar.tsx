import { useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { palette, whiteAlpha } from '@/shared/theme';
import { useTabBlurTarget } from './tabBlurTargets';

const BAR_HEIGHT = 80;
const BAR_RADIUS = 160;
const BAR_MARGIN = 24;
const BAR_BOTTOM_GAP = 0;
const CIRCLE = 48;
const TAB_PADDING = 16;

// TODO: re-enable liquid glass when styling is finalized
const USE_LIQUID_GLASS = false; // isLiquidGlassAvailable();

/**
 * Screen space the floating bar occupies above the device bottom edge — pass
 * to a scrollable screen's `contentContainerStyle.paddingBottom` so the tail
 * end of its content can be scrolled fully clear of the bar, rather than
 * guessing a magic number.
 */
export function useFloatingTabBarClearance(extraMargin = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + BAR_BOTTOM_GAP + BAR_HEIGHT + extraMargin;
}

const NAV_ON_ACTIVE = palette.black;
const NAV_INACTIVE = whiteAlpha(0.55);

/**
 * Floating pill nav bar with liquid glass (iOS 26+) or dark blur fallback,
 * a sliding white active indicator, and a thin border ring for depth.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteKey = state.routes[state.index].key;
  const blurTarget = useTabBlurTarget(activeRouteKey);
  const indicatorX = useTabIndicator(state.index);
  const wrapper = [styles.wrapper, { bottom: insets.bottom + BAR_BOTTOM_GAP }];

  const content = (
    <>
      {indicatorX.ready && (
        <Animated.View pointerEvents="none" style={[styles.indicator, { transform: [{ translateX: indicatorX.value }] }]} />
      )}
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLayout={(e) => indicatorX.onTabLayout(index, e)}
              style={styles.tab}
            >
              {descriptors[route.key].options.tabBarIcon?.({ focused, color: focused ? NAV_ON_ACTIVE : NAV_INACTIVE, size: 22 })}
            </Pressable>
          );
        })}
      </View>
    </>
  );

  if (USE_LIQUID_GLASS) {
    return (
      <View style={wrapper}>
        <GlassView glassEffectStyle="clear" style={styles.bar}>
          {content}
        </GlassView>
      </View>
    );
  }

  return (
    <View style={wrapper}>
      <View style={[styles.bar, styles.ring]}>
        <View style={styles.clip}>
          <BlurView
            // remount per tab so the native view binds to the newly focused target
            key={activeRouteKey}
            intensity={40}
            tint="systemMaterialDark"
            blurTarget={blurTarget}
            blurMethod={blurTarget ? 'dimezisBlurViewSdk31Plus' : 'none'}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {content}
      </View>
    </View>
  );
}

/**
 * The active circle's horizontal position, centred on the focused tab as it
 * was actually laid out — not on a slot computed from the bar's width, which
 * the bar's border and any re-measure throw off. The tabs row and the circle
 * share the bar's padding box, so a tab's own `x` is the circle's coordinate
 * too. Placed without animation until every tab is measured (and whenever
 * the layout changes), then sprung without overshoot, so it never swings
 * past the icon.
 */
function useTabIndicator(index: number) {
  const value = useRef(new Animated.Value(0)).current;
  const [centres, setCentres] = useState<(number | undefined)[]>([]);
  const placed = useRef(false);

  const onTabLayout = (tab: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    // `x` is within the tabs row, padding included — the circle's own frame
    const centre = x + width / 2;
    setCentres((prev) => {
      if (prev[tab] === centre) return prev;
      placed.current = false;
      const next = [...prev];
      next[tab] = centre;
      return next;
    });
  };

  const target = centres[index];
  useEffect(() => {
    if (target === undefined) return;
    const x = target - CIRCLE / 2;
    if (!placed.current) {
      value.stopAnimation();
      value.setValue(x);
      placed.current = true;
      return;
    }
    Animated.spring(value, { toValue: x, useNativeDriver: true, damping: 28, stiffness: 220, mass: 0.9, overshootClamping: true }).start();
  }, [target, value]);

  return { value, ready: target !== undefined, onTabLayout };
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: BAR_MARGIN, right: BAR_MARGIN, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 380, height: BAR_HEIGHT, borderRadius: BAR_RADIUS },
  ring: { borderWidth: 1, borderColor: whiteAlpha(0.12) },
  clip: { ...StyleSheet.absoluteFill, borderRadius: BAR_RADIUS, overflow: 'hidden' },
  indicator: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    top: (BAR_HEIGHT - CIRCLE) / 2,
    left: 0,
    backgroundColor: palette.white,
  },
  tabs: { flexDirection: 'row', height: BAR_HEIGHT, paddingHorizontal: TAB_PADDING },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
