import { useEffect, useRef } from 'react';
import { AppState, Pressable, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import type { AuthScreenProps } from '@/app/navigation/types';

const POLL_INTERVAL = 4000;

export function CheckEmailScreen({ navigation, route }: AuthScreenProps<'CheckEmail'>) {
    const { palette, radii } = useTheme();
    const { email, password } = route.params;
    const polling = useRef<ReturnType<typeof setInterval>>(undefined);
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
            <View style={{ paddingBottom: 16 }}>
                <BackButton onPress={() => navigation.popToTop()} />
            </View>
            <View style={styles.content}>
                <View style={styles.hero}>
                    <View style={styles.iconCircle}>
                        <Image source={require('../../../assets/email-solid.png')}/>
                    </View>
                    <AppText variant="title" gradient style={{ fontSize: 40, textAlign: 'center' }}>
                        Check your email
                    </AppText>
                    <View style={{
                        alignItems: 'center',
                        gap: 10,
                    }}>
                        <AppText
                            variant="body"
                            style={{
                                fontSize: 20,
                                color: palette.textSecondaryElevated,
                            }}
                        >
                            We sent a confirmation link to</AppText>
                        <AppText variant="body"
                                 style={{
                                     fontSize: 20,
                                     color: palette.textPrimary,
                                     fontFamily: typography.family.bold
                                 }}>
                            {email}
                        </AppText>
                        <AppText variant="body"
                                 style={{
                                     fontSize: 20,
                                     color: palette.textSecondaryElevated,
                                 }}>
                            Tap the link to activate your account.
                        </AppText>
                    </View>
                </View>
                <Button onPress={() => navigation.popToTop()} variant="ghost" title={"Back to sign in"} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, justifyContent: 'center', gap: 40 },
    hero: { alignItems: 'center', gap: 16 },
    iconCircle: {
        width: 118,
        height: 118,
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
