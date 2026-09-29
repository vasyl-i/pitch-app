import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';

const ICON = require('../../../assets/onboarding/tune.png');

/** Splash screen: treble clef icon, tagline, and a single CTA. */
export function VocalRangeStartScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
    const { spacing, typography, palette } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Screen noBottomPadding>                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <BackButton onPress={() => navigation.goBack()}/>
        </View>
            <View style={styles.root}>
                <View style={styles.content}>
                    <Image source={ICON} style={styles.icon} resizeMode="contain" />
                    <AppText
                        variant="title"
                        color={palette.textPrimary}
                        style={{ fontSize: 28, textAlign: 'center', fontFamily: typography.family.bold, marginTop: spacing.xl }}
                    >
                        Let's discover your{'\n'}vocal range
                    </AppText>
                    <AppText
                        variant="body"
                        color={palette.textSecondary}
                        style={{ textAlign: 'center', marginTop: spacing.md, lineHeight: 22 }}
                    >
                        This helps us personalize every exercise{'\n'}and protect your voice.
                    </AppText>
                </View>

                <View style={{ paddingBottom: insets.bottom + spacing.lg }}>
                    <Button
                        title="Start"
                        onPress={() => navigation.navigate('Lowest')}
                        style={{ backgroundColor: '#ffffff' }}
                    />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 100,
        height: 100,
    },
});
