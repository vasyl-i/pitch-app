import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppText, BackButton, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { useAuthStore } from '@/features/auth';
import type { AuthScreenProps } from '@/app/navigation/types';

export function EmailSignUpScreen({ navigation, route }: AuthScreenProps<'EmailSignUp'>) {
    const { spacing, palette, radii, blur, typography } = useTheme();
    const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    const { email } = route.params;
    const valid = name.trim().length >= 1 && password.length >= 6;

    const handleSignUp = async () => {
        setLoading(true);
        try {
            const confirmed = await signUpWithEmail(email, name.trim(), password);
            if (!confirmed) {
                navigation.replace('CheckEmail', { email, password });
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Something went wrong';
            Alert.alert('Sign up failed', message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = [styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }];

    return (
        <Screen dismissKeyboard avoidKeyboard>
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.content}>
                <View style={styles.header}>
                    <AppText variant="title" style={{ fontSize: 26, textAlign: 'center' }}>
                        Create your account
                    </AppText>
                    <AppText variant="body" style={{ textAlign: 'center', color: palette.textSecondary }}>
                        {email}
                    </AppText>
                </View>
                <View style={{ gap: spacing.sm }}>
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            style={inputStyle}
                            placeholder="Your name"
                            placeholderTextColor={palette.textSecondary}
                            autoCapitalize="words"
                            autoComplete="name"
                            autoFocus
                            value={name}
                            onChangeText={setName}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                    </View>
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            ref={passwordRef}
                            style={inputStyle}
                            placeholder="Password (6+ characters)"
                            placeholderTextColor={palette.textSecondary}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            returnKeyType="go"
                            onSubmitEditing={() => { if (valid && !loading) handleSignUp(); }}
                        />
                    </View>
                </View>
                <Pressable
                    accessibilityRole="button"
                    disabled={!valid || loading}
                    onPress={handleSignUp}
                    style={({ pressed }) => [
                        styles.button,
                        {
                            borderRadius: radii.pill,
                            backgroundColor: palette.buttonPrimaryBg,
                            shadowColor: palette.accent,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: valid && !loading ? 0.4 : 0,
                            shadowRadius: 18,
                        },
                        (pressed || !valid || loading) && { opacity: (!valid || loading) ? 0.3 : 0.8 },
                    ]}
                >
                    <AppText variant="label" color={palette.buttonPrimaryText}>
                        {loading ? 'Creating account...' : 'Create account'}
                    </AppText>
                </Pressable>
                <Pressable
                    onPress={() => {
                        navigation.replace('EmailSignIn', { email });
                    }}
                    style={styles.switchLink}
                >
                    <AppText variant="body" style={{ color: palette.textSecondary }}>
                        Already have an account?{' '}
                    </AppText>
                    <AppText variant="body" style={{ color: palette.accent }}>
                        Sign in
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
