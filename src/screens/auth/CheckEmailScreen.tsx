import { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import type { AuthScreenProps } from '@/app/navigation/types';

const POLL_INTERVAL = 4000;

export function CheckEmailScreen({ navigation, route }: AuthScreenProps<'CheckEmail'>) {
    const { palette, radii } = useTheme();
    const { email, password } = route.params;
    const polling = useRef<ReturnType<typeof setInterval>>();
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;

        const trySignIn = async () => {
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (!error && mounted.current) {
                    // Sign-in succeeded — email was confirmed.
                    // Auth state listener in AuthGate handles navigation.
                    clearInterval(polling.current);
                }
            } catch {
                // Ignore — email not yet confirmed
            }
        };

        // Check when app returns to foreground
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') trySignIn();
        });

        // Poll periodically
        polling.current = setInterval(trySignIn, POLL_INTERVAL);

        return () => {
            mounted.current = false;
            sub.remove();
            clearInterval(polling.current);
        };
    }, [email, password]);

    return (
        <Screen>
            <View style={styles.content}>
                <View style={styles.hero}>
                    <View style={[styles.iconCircle, { backgroundColor: palette.surface }]}>
                        <Ionicons name="mail-open" size={48} color={palette.accent} />
                    </View>
                    <AppText variant="title" style={{ fontSize: 26, textAlign: 'center' }}>
                        Check your email
                    </AppText>
                    <AppText
                        variant="body"
                        style={{ textAlign: 'center', color: palette.textSecondary, lineHeight: 22 }}
                    >
                        We sent a confirmation link to{'\n'}
                        <AppText variant="body" style={{ color: palette.textPrimary }}>
                            {email}
                        </AppText>
                        {'\n'}Tap the link to activate your account.
                    </AppText>
                </View>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.popToTop()}
                    style={({ pressed }) => [
                        styles.button,
                        {
                            borderRadius: radii.pill,
                            backgroundColor: palette.surface,
                        },
                        pressed && { opacity: 0.8 },
                    ]}
                >
                    <AppText variant="label" color={palette.textPrimary}>
                        Back to sign in
                    </AppText>
                </Pressable>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, justifyContent: 'center', gap: 32 },
    hero: { alignItems: 'center', gap: 16 },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    button: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
});
