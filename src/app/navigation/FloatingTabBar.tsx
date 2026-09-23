import { useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

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

const NAV_ACTIVE = '#C8DA59';
const NAV_ON_ACTIVE = '#0A0A05';
const NAV_INACTIVE = 'rgba(228, 228, 232, 0.55)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.12)';

/**
 * Floating pill nav bar with liquid glass (iOS 26+) or dark blur fallback,
 * a sliding lime active indicator, and a thin border ring for depth.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
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
    const tabWidth = (width - TAB_PADDING * 2) / state.routes.length;

    const content = (
        <>
            {/* Active indicator circle */}
            {width > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: CIRCLE,
                        height: CIRCLE,
                        borderRadius: CIRCLE / 2,
                        top: (BAR_HEIGHT - CIRCLE) / 2,
                        left: TAB_PADDING + (tabWidth - CIRCLE) / 2,
                        backgroundColor: NAV_ACTIVE,
                        transform: [{ translateX: Animated.multiply(translateX, tabWidth) }],
                    }}
                />
            )}

            {/* Tab buttons */}
            <View style={{ flexDirection: 'row', height: BAR_HEIGHT, paddingHorizontal: TAB_PADDING }}>
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
                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                        >
                            {options.tabBarIcon?.({ focused, color: focused ? NAV_ON_ACTIVE : NAV_INACTIVE, size: 22 })}
                        </Pressable>
                    );
                })}
            </View>
        </>
    );

    const wrapperStyle = {
        position: 'absolute' as const,
        left: BAR_MARGIN,
        right: BAR_MARGIN,
        bottom: insets.bottom + BAR_BOTTOM_GAP,
        alignItems: 'center' as const,
    };

    const barStyle = {
        width: '100%' as const,
        maxWidth: 380,
        height: BAR_HEIGHT,
        borderRadius: BAR_RADIUS,
    };

    if (USE_LIQUID_GLASS) {
        return (
            <View style={wrapperStyle}>
                <GlassView onLayout={onLayout} glassEffectStyle="clear" style={barStyle}>
                    {content}
                </GlassView>
            </View>
        );
    }

    return (
        <View style={wrapperStyle}>
            <View onLayout={onLayout} style={{ ...barStyle, borderWidth: 1, borderColor: BORDER_COLOR }}>
                <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]}>
                    <BlurView intensity={40} tint="systemMaterialDark" style={StyleSheet.absoluteFill} />
                </View>
                {content}
            </View>
        </View>
    );
}
