import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Text as SkText, useFont, vec } from '@shopify/react-native-skia';
import { AppText, Screen } from '@/shared/ui';
import { palette, spacing, useTheme } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';
import { WinkCat } from '../../../assets/svg';
import type { AuthStackParamList } from '@/app/navigation/types';

/**
 * Resolved once at module load. App.tsx waits for this before hiding the
 * splash screen, so by the time SignInScreen renders the value is settled.
 */
let _appleAvailable = false;
if (Platform.OS === 'ios') {
    AppleAuthentication.isAvailableAsync().then((v) => {
        _appleAvailable = v;
    });
}

const SUBTITLE_LINES = ['Save your progress, continue', 'where you finished.'];
const FONT_SIZE = 16;
const LINE_HEIGHT = 24; // matches body variant (fontSize * 1.5)

export function SignInScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const { spacing, palette, radii, blur } = useTheme();
    const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
    const signInWithApple = useAuthStore((s) => s.signInWithApple);
    const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
    const [loading, setLoading] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(0);
    const font = useFont(require('../../../assets/fonts/Satoshi-Regular.ttf'), FONT_SIZE);

    const handleSignIn = async (provider: 'google' | 'apple') => {
        setLoading(true);
        try {
            await (provider === 'google' ? signInWithGoogle() : signInWithApple());
        } catch (e: unknown) {
            if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
            const message = e instanceof Error ? e.message : 'Something went wrong';
            Alert.alert('Sign in failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen>
            <View style={styles.content}>
                <View style={styles.hero}>
                    <WinkCat/>
                    <AppText variant="title" style={{ fontSize: 30, textAlign: 'center' }}>
                        Let's get started!
                    </AppText>
                    <View
                        style={{ width: '100%', marginTop: spacing.sm, height: FONT_SIZE + LINE_HEIGHT + 6 }}
                        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
                    >
                        {font && canvasWidth > 0 && SUBTITLE_LINES.map((line, i) => {
                            const lineWidth = font.measureText(line).width;
                            const x = (canvasWidth - lineWidth) / 2;
                            return (
                                <Canvas key={i} style={[StyleSheet.absoluteFill, { top: i * LINE_HEIGHT }]}>
                                    <SkText x={x} y={FONT_SIZE} text={line} font={font}>
                                        <LinearGradient
                                            start={vec(0, 0)}
                                            end={vec(canvasWidth, 0)}
                                            colors={['#ffffff', 'rgba(255, 255, 255, 0.3)']}
                                        />
                                    </SkText>
                                </Canvas>
                            );
                        })}
                    </View>
                </View>
                <View style={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
                    {_appleAvailable && (
                        <Pressable
                            accessibilityRole="button"
                            disabled={loading}
                            onPress={() => handleSignIn('apple')}
                            style={({ pressed }) => [
                                styles.authButton,
                                { borderRadius: radii.pill, backgroundColor: '#FFFFFF' },
                                (pressed || loading) && { opacity: loading ? 0.3 : 0.8 },
                            ]}
                        >
                            <Ionicons name="logo-apple" size={14} color="#000000"/>
                            <AppText variant="label" color="#000000">
                                {loading ? 'Signing in...' : 'Continue with Apple'}
                            </AppText>
                        </Pressable>
                    )}
                    <Pressable
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={() => handleSignIn('google')}
                        style={({ pressed }) => [
                            styles.authButton,
                            { borderRadius: radii.pill, overflow: 'hidden' as const },
                            (pressed || loading) && { opacity: loading ? 0.3 : 0.8 },
                        ]}
                    >
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill}/>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]}/>
                        <Ionicons name="logo-google" size={14} color={palette.textPrimary}/>
                        <AppText variant="label" color={palette.textPrimary}>
                            {loading ? 'Signing in...' : 'Continue with Google'}
                        </AppText>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => navigation.navigate('EmailEntry')}
                        style={({ pressed }) => [
                            styles.authButton,
                            { borderRadius: radii.pill, overflow: 'hidden' as const },
                            pressed && { opacity: 0.8 },
                        ]}
                    >
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill}/>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]}/>
                        <Ionicons name="mail" size={14} color={palette.textPrimary}/>
                        <AppText variant="label" color={palette.textPrimary}>Continue with email</AppText>
                    </Pressable>
                    <View style={styles.noSignInTextContainer}>
                        <Text style={styles.noSignInText}>{'Want to try first? '}</Text>
                        <Pressable onPress={continueAsGuest} style={styles.clickableTextContainer}>
                            <Text style={styles.noSignInTextClickable}>{'Proceed without account'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
            content: {
                flex: 1,
                justifyContent: 'flex-end',
            },
            hero: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 40 },
            authButton: {
                height: 58,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
            },
            noSignInTextContainer: {
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingTop: spacing.lg,
                alignSelf: 'center',
                alignItems: 'center',
                textAlign: 'center',
            },
            noSignInText: {
                color: palette.textPrimary,
            },
            clickableTextContainer:
                {
                    alignItems: 'center',
                    alignSelf: 'center',
                },
            noSignInTextClickable: {
                color: palette.buttonPrimaryBg,
            }
        }
    )
;
