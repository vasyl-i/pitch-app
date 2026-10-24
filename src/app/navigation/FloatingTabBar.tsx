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
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(state.index)).current;
  const activeRouteKey = state.routes[state.index].key;
  const blurTarget = useTabBlurTarget(activeRouteKey);

  useEffect(() => {
    Animated.spring(translateX, { toValue: state.index, useNativeDriver: true, damping: 20, stiffness: 220, mass: 0.9 }).start();
  }, [state.index, translateX]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tabWidth = (width - TAB_PADDING * 2) / state.routes.length;
  const wrapper = [styles.wrapper, { bottom: insets.bottom + BAR_BOTTOM_GAP }];

  const content = (
    <>
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { left: TAB_PADDING + (tabWidth - CIRCLE) / 2, transform: [{ translateX: Animated.multiply(translateX, tabWidth) }] },
          ]}
        />
      )}
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable key={route.key} accessibilityRole="button" accessibilityState={focused ? { selected: true } : {}} onPress={onPress} style={styles.tab}>
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
        <GlassView onLayout={onLayout} glassEffectStyle="clear" style={styles.bar}>
          {content}
        </GlassView>
      </View>
    );
  }

  return (
    <View style={wrapper}>
      <View onLayout={onLayout} style={[styles.bar, styles.ring]}>
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
    backgroundColor: palette.white,
  },
  tabs: { flexDirection: 'row', height: BAR_HEIGHT, paddingHorizontal: TAB_PADDING },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
