import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { BlurView } from 'expo-blur';
import { AmpMaskView } from '@amplitude/plugin-session-replay-react-native';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { reportSignInError, trackSignInAttempt, trackSignInSuccess, useAuthStore } from '@/features/auth';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';

export function EmailSignInScreen({ navigation, route }: AuthScreenProps<'EmailSignIn'>) {
    const { t } = useTranslation();
    const { spacing, palette, radii, blur, typography } = useTheme();
    const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
    const resetPassword = useAuthStore((s) => s.resetPassword);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);

    const { email } = route.params;
    const valid = password.length >= 6;

    const handleSignIn = async () => {
        setLoading(true);
        trackSignInAttempt('email');
        try {
            await signInWithEmail(email, password);
            trackSignInSuccess('email');
        } catch (e: unknown) {
            const message = reportSignInError('email', e);
            if (message) Alert.alert(t('auth.signIn.failed'), message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen dismissKeyboard avoidKeyboard>
          <View style={{ paddingBottom: 16 }}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <AmpMaskView mask="amp-block" style={{ flex: 1 }}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <AppText variant="title" style={{ fontSize: 26, textAlign: 'center' }}>
                        {t('auth.emailSignIn.title')}
                    </AppText>
                    <AppText variant="body" style={{ textAlign: 'center', color: palette.textSecondary }}>
                        {email}
                    </AppText>
                </View>
                <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                    <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                    <TextInput
                        style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                        placeholder={t('auth.passwordPlaceholder')}
                        placeholderTextColor={palette.textSecondary}
                        secureTextEntry
                        autoFocus
                        value={password}
                        onChangeText={setPassword}
                        returnKeyType="go"
                        onSubmitEditing={() => { if (valid && !loading) handleSignIn(); }}
                    />
                </View>
                <Pressable
                    accessibilityRole="button"
                    disabled={!valid || loading}
                    onPress={handleSignIn}
                    style={({ pressed }) => [
                        styles.button,
                        {
                            borderRadius: radii.pill,
                            backgroundColor: palette.buttonPrimaryBg,
                        },
                        (pressed || !valid || loading) && { opacity: (!valid || loading) ? 0.3 : 0.8 },
                    ]}
                >
                    <AppText variant="label" color={palette.buttonPrimaryText}>
                        {loading ? t('auth.signIn.signingIn') : t('auth.signInCta')}
                    </AppText>
                </Pressable>
                <Pressable
                    disabled={resetting}
                    onPress={async () => {
                        setResetting(true);
                        try {
                            await resetPassword(email);
                            navigation.navigate('ResetPasswordSent', { email });
                        } catch {
                            Toast.show({ type: 'error', text1: t('common.somethingWentWrong'), text2: t('common.tryAgainLater') });
                        } finally {
                            setResetting(false);
                        }
                    }}
                    style={styles.switchLink}
                >
                    <AppText variant="body" style={{ color: palette.accent }}>
                        {resetting ? t('auth.emailSignIn.sending') : t('auth.emailSignIn.forgot')}
                    </AppText>
                </Pressable>
                <Pressable
                    onPress={() => {
                        navigation.replace('EmailSignUp', { email });
                    }}
                    style={styles.switchLink}
                >
                    <AppText variant="body" style={{ color: palette.textSecondary }}>
                        {t('auth.emailSignIn.noAccount')}
                    </AppText>
                    <AppText variant="body" style={{ color: palette.accent }}>
                        {t('auth.emailSignIn.createOne')}
                    </AppText>
                </Pressable>
            </View>
          </AmpMaskView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, justifyContent: 'center', gap: 24 },
    header: { alignItems: 'center', gap: 8 },
    inputWrapper: { height: 58, justifyContent: 'center' },
    input: { height: 58, paddingHorizontal: 20, fontSize: 16 },
    button: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    switchLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
