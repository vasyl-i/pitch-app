import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import type { AuthScreenProps } from '@/app/navigation/types';

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function EmailEntryScreen({ navigation }: AuthScreenProps<'EmailEntry'>) {
    const { spacing, palette, radii, blur, typography } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const trimmed = email.trim();
    const valid = EMAIL_RE.test(trimmed);

    const handleProceed = async () => {
        if (!valid) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('email_exists', {
                lookup_email: trimmed,
            });

            if (rpcError) {
                Alert.alert('Something went wrong', rpcError.message);
                return;
            }

            if (data) {
                navigation.navigate('EmailSignIn', { email: trimmed });
            } else {
                navigation.navigate('EmailSignUp', { email: trimmed });
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Something went wrong';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen dismissKeyboard avoidKeyboard>
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.content}>
                <View style={styles.header}>
                    <AppText variant="title" style={{ fontSize: 26, textAlign: 'center' }}>
                        What's your email?
                    </AppText>
                    <AppText variant="body" style={{ textAlign: 'center', color: palette.textSecondary }}>
                        We'll use this to sign you in or create your account.
                    </AppText>
                </View>
                <View>
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                            placeholder="Email address"
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
                        {loading ? 'Checking...' : 'Proceed'}
                    </AppText>
                </Pressable>
            </View>
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
