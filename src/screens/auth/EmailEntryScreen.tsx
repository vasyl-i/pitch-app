import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AmpMaskView } from '@amplitude/plugin-session-replay-react-native';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import { useTranslation } from '@/shared/i18n';
import type { AuthScreenProps } from '@/app/navigation/types';

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function EmailEntryScreen({ navigation }: AuthScreenProps<'EmailEntry'>) {
    const { t } = useTranslation();
    const { spacing, palette, radii, blur, typography } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const trimmed = email.trim();
    const valid = EMAIL_RE.test(trimmed);

    const handleProceed = async () => {
        if (!valid) {
            setError(t('auth.invalidEmail'));
            return;
        }

        setError('');
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('email_exists', {
                lookup_email: trimmed,
            });

            if (rpcError) {
                Alert.alert(t('common.somethingWentWrong'), rpcError.message);
                return;
            }

            if (data) {
                navigation.navigate('EmailSignIn', { email: trimmed });
            } else {
                navigation.navigate('EmailSignUp', { email: trimmed });
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : t('common.somethingWentWrong');
            Alert.alert(t('common.error'), message);
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
                        {t('auth.emailEntry.title')}
                    </AppText>
                    <AppText variant="body" style={{ textAlign: 'center', color: palette.textSecondary }}>
                        {t('auth.emailEntry.subtitle')}
                    </AppText>
                </View>
                <View>
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                            placeholder={t('auth.emailPlaceholder')}
                            placeholderTextColor={palette.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (error) setError('');
                            }}
                            returnKeyType="go"
                            onSubmitEditing={handleProceed}
                        />
                    </View>
                    {error ? (
                        <AppText
                            variant="body"
                            style={{ color: '#FF6B6B', fontSize: 13, marginTop: spacing.xs, paddingHorizontal: 20 }}
                        >
                            {error}
                        </AppText>
                    ) : null}
                </View>
                <Pressable
                    accessibilityRole="button"
                    disabled={!valid || loading}
                    onPress={handleProceed}
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
                        {loading ? t('auth.emailEntry.checking') : t('auth.emailEntry.proceed')}
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
});
