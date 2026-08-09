import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/shared/theme';

const BAR_HEIGHT = 76;
const BAR_RADIUS = 38;
const BAR_MARGIN = 18;
const BAR_BOTTOM_GAP = 12;
const CIRCLE = 58;

/**
 * Screen space the floating bar occupies above the device bottom edge — pass
 * to a scrollable screen's `contentContainerStyle.paddingBottom` so the tail
 * end of its content can be scrolled fully clear of the bar, rather than
 * guessing a magic number. Content still flows *behind* the bar while
 * scrolling (the intended floating look); this only guarantees there's
 * enough room to scroll it out from under. Pass `extraMargin` for breathing
 * room beyond the bar itself.
 */
export function useFloatingTabBarClearance(extraMargin = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + BAR_BOTTOM_GAP + BAR_HEIGHT + extraMargin;
}

const NAV_ACTIVE = '#C8DA59';
const NAV_ON_ACTIVE = '#0A0A05';
const NAV_INACTIVE = 'rgba(228, 228, 232, 0.8)';

/**
 * Floating pill nav bar, built as a custom `tabBar` (rather than styling the
 * default one) so the active indicator is a single circle that slides
 * between tabs on an Animated.spring instead of popping in per-icon. Matte
 * acrylic material — a soft vertical gradient plus a light blur, not a
 * see-through glass panel — with a faint inner top highlight.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { blur } = useTheme();
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [state.index, translateX]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tabWidth = width / state.routes.length;

  return (
    <View
      onLayout={onLayout}
      style={{
        position: 'absolute',
        left: BAR_MARGIN,
        right: BAR_MARGIN,
        bottom: insets.bottom + BAR_BOTTOM_GAP,
        height: BAR_HEIGHT,
        borderRadius: BAR_RADIUS,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.38,
        shadowRadius: 30,
        elevation: 12,
      }}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]}>
        <BlurView intensity={blur.nav} tint="dark" style={StyleSheet.absoluteFill} />
        {/* rgb(7, 7, 12) mirrors palette.background, so the bar reads as the page's
            own surface made translucent rather than a distinct gray material */}
        <LinearGradient
          colors={['rgba(7, 7, 12, 0.44)', 'rgba(7, 7, 12, 0.4)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%' }}
        />
      </View>

      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: CIRCLE / 2,
            top: (BAR_HEIGHT - CIRCLE) / 2,
            left: (tabWidth - CIRCLE) / 2,
            backgroundColor: NAV_ACTIVE,
            shadowColor: NAV_ACTIVE,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 8,
            transform: [{ translateX: Animated.multiply(translateX, tabWidth) }],
          }}
        />
      )}

      <View style={{ flexDirection: 'row', height: BAR_HEIGHT }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
              style={{ width: tabWidth, alignItems: 'center', justifyContent: 'center' }}
            >
              {options.tabBarIcon?.({ focused, color: focused ? NAV_ON_ACTIVE : NAV_INACTIVE, size: 22 })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
