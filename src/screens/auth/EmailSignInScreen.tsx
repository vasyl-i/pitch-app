import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';
import type { AuthScreenProps } from '@/app/navigation/types';

export function EmailSignInScreen({ navigation, route }: AuthScreenProps<'EmailSignIn'>) {
    const { spacing, palette, radii, blur, typography } = useTheme();
    const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { email } = route.params;
    const valid = password.length >= 6;

    const handleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithEmail(email, password);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Something went wrong';
            Alert.alert('Sign in failed', message);
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
                        Welcome back
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
                        placeholder="Password"
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
                        {loading ? 'Signing in...' : 'Sign in'}
                    </AppText>
                </Pressable>
                <Pressable
                    onPress={() => {
                        navigation.replace('EmailSignUp', { email });
                    }}
                    style={styles.switchLink}
                >
                    <AppText variant="body" style={{ color: palette.textSecondary }}>
                        {"Don't have an account? "}
                    </AppText>
                    <AppText variant="body" style={{ color: palette.accent }}>
                        Create one
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
    switchLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
