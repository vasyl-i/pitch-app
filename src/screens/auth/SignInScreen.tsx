import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Text as SkText, vec } from '@shopify/react-native-skia';
import { AppText, Screen, useCanvasFont } from '@/shared/ui';
import { palette, spacing, typography, useTheme } from '@/shared/theme';
import { reportSignInError, trackSignInAttempt, trackSignInSuccess, useAuthStore } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
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

const FONT_SIZE = 16;
const LINE_HEIGHT = 24; // matches body variant (fontSize * 1.5)

export function SignInScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const { spacing, palette, radii, blur } = useTheme();
    const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
    const signInWithApple = useAuthStore((s) => s.signInWithApple);
    const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
    const [loading, setLoading] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(0);
    // drawn line-by-line on a Skia canvas for the gradient, so the copy carries explicit line breaks
    const subtitleLines = t('auth.signIn.subtitle').split('\n');
    // Satoshi has no Cyrillic, and Skia (unlike <Text>) needs useCanvasFont to fall back to Manrope
    const { fontFor } = useCanvasFont(require('../../../assets/fonts/Satoshi-Regular.ttf'), FONT_SIZE);
    const font = fontFor(subtitleLines.join(''));

    const handleSignIn = async (provider: 'google' | 'apple') => {
        setLoading(true);
        trackSignInAttempt(provider);
        try {
            await (provider === 'google' ? signInWithGoogle() : signInWithApple());
            trackSignInSuccess(provider);
        } catch (e: unknown) {
            const message = reportSignInError(provider, e);
            if (message) Alert.alert(t('auth.signIn.failed'), message);
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
                        {t('auth.signIn.title')}
                    </AppText>
                    <View
                        style={{ width: '100%', marginTop: spacing.sm, height: FONT_SIZE + LINE_HEIGHT + 6 }}
                        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
                    >
                        {font && canvasWidth > 0 && subtitleLines.map((line, i) => {
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
                                {loading ? t('auth.signIn.signingIn') : t('auth.signIn.apple')}
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
                            {loading ? t('auth.signIn.signingIn') : t('auth.signIn.google')}
                        </AppText>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={() => navigation.navigate('EmailEntry')}
                        style={({ pressed }) => [
                            styles.authButton,
                            { borderRadius: radii.pill, overflow: 'hidden' as const },
                            (pressed || loading) && { opacity: loading ? 0.3 : 0.8 },
                        ]}
                    >
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill}/>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]}/>
                        <Ionicons name="mail" size={14} color={palette.textPrimary}/>
                        <AppText variant="label" color={palette.textPrimary}>{loading ? t('auth.signIn.signingIn') : t('auth.signIn.email')}</AppText>
                    </Pressable>
                    <View style={styles.noSignInTextContainer}>
                        <AppText variant="label" color={palette.textPrimary} gradient={false} style={styles.noSignInText}>{t('auth.signIn.tryFirst')}</AppText>
                        <Pressable onPress={() => {
                            Alert.alert(
                              t('auth.guest.title'),
                              t('auth.guest.message'),
                              [
                                { text: t('common.goBack'), style: 'cancel' },
                                { text: t('common.continue'), onPress: continueAsGuest },
                              ],
                            );
                        }} style={styles.clickableTextContainer}>
                            <AppText variant="label" color={palette.buttonPrimaryBg} style={styles.noSignInText}>{t('auth.signIn.withoutAccount')}</AppText>
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
                flexDirection: 'column',
                // flexWrap: 'wrap',
                paddingTop: spacing.lg,
                alignSelf: 'center',
                alignItems: 'center',
                textAlign: 'center',

            },
            noSignInText: {
                fontSize: typography.size.sm,
                lineHeight: typography.size.sm * 1.4,
            },
            clickableTextContainer:
                {
                    alignItems: 'center',
                    alignSelf: 'center',
                },
        }
    )
;
