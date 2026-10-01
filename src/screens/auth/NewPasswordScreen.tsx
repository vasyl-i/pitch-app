import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AppText, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { supabase } from '@/shared/lib/supabase';
import type { RootScreenProps } from '@/app/navigation/types';

export function NewPasswordScreen({ navigation, route }: RootScreenProps<'NewPassword'>) {
    const { spacing, palette, radii, blur, typography } = useTheme();
    const requireOldPassword = route.params?.requireOldPassword ?? false;
    const [oldPassword, setOldPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const valid = password.length >= 6 && password === confirm && (!requireOldPassword || oldPassword.length > 0);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (requireOldPassword) {
                // Re-authenticate with old password to verify identity
                const email = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.email : undefined;
                if (!email) throw new Error('Could not retrieve account email');
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
                if (signInError) throw new Error('Current password is incorrect');
            }
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            Toast.show({ type: 'success', text1: 'Password updated', text2: 'Your password has been changed' });
            navigation.goBack();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Something went wrong';
            Toast.show({ type: 'error', text1: 'Could not update password', text2: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen dismissKeyboard avoidKeyboard>
            <View style={styles.content}>
                <View style={styles.hero}>
                    <View style={[styles.iconCircle, { backgroundColor: palette.surface }]}>
                        <Ionicons name="lock-closed" size={48} color={palette.accent} />
                    </View>
                    <AppText variant="title" style={{ fontSize: 26, textAlign: 'center' }}>
                        {requireOldPassword ? 'Change password' : 'Set new password'}
                    </AppText>
                    <AppText variant="body" style={{ textAlign: 'center', color: palette.textSecondary }}>
                        {requireOldPassword ? 'Verify your current password, then choose a new one.' : 'Choose a new password for your account.'}
                    </AppText>
                </View>

                <View style={{ gap: spacing.md }}>
                    {requireOldPassword && (
                        <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                            <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                            <TextInput
                                style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                                placeholder="Current password"
                                placeholderTextColor={palette.textSecondary}
                                secureTextEntry
                                autoFocus
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                returnKeyType="next"
                            />
                        </View>
                    )}
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                            placeholder="New password"
                            placeholderTextColor={palette.textSecondary}
                            secureTextEntry
                            autoFocus={!requireOldPassword}
                            value={password}
                            onChangeText={setPassword}
                            returnKeyType="next"
                        />
                    </View>
                    <View style={[styles.inputWrapper, { borderRadius: radii.pill, overflow: 'hidden' }]}>
                        <BlurView intensity={blur.card} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.surface }]} />
                        <TextInput
                            style={[styles.input, { color: palette.textPrimary, fontFamily: typography.family.regular }]}
                            placeholder="Confirm password"
                            placeholderTextColor={palette.textSecondary}
                            secureTextEntry
                            value={confirm}
                            onChangeText={setConfirm}
                            returnKeyType="go"
                            onSubmitEditing={() => { if (valid && !loading) handleSubmit(); }}
                        />
                    </View>
                    {password.length > 0 && password.length < 6 && (
                        <AppText variant="caption" style={{ color: palette.textSecondary, paddingHorizontal: 20 }}>
                            Password must be at least 6 characters
                        </AppText>
                    )}
                    {confirm.length > 0 && password !== confirm && (
                        <AppText variant="caption" style={{ color: palette.danger, paddingHorizontal: 20 }}>
                            Passwords do not match
                        </AppText>
                    )}
                </View>

                <Pressable
                    accessibilityRole="button"
                    disabled={!valid || loading}
                    onPress={handleSubmit}
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
                        {loading ? 'Updating...' : 'Update password'}
                    </AppText>
                </Pressable>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, justifyContent: 'center', gap: 24 },
    hero: { alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
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
