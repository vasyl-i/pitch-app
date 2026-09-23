import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { OnboardingScreenProps } from '@/app/navigation/types';


const WELCOME_IMAGE = require('../../../assets/onboarding/welcome.png');

/** Splash screen: cat illustration, tagline, and a single CTA. */
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
    const { spacing, typography } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Screen noHorizontalPadding noBottomPadding>
            <View style={styles.root}>
                {/* Cat pinned to the bottom */}
                <View style={styles.imageContainer}>
                    <Image source={WELCOME_IMAGE} style={styles.image} resizeMode="contain"/>
                </View>

                {/* Text + button overlaying the bottom of the cat */}
                <View style={[styles.bottom]}>
                    <View style={{
                        paddingHorizontal: 24
                    }}>
                        <AppText
                            variant="title"
                            color="#000000"
                            style={{ fontSize: 40, textAlign: 'center', fontFamily: typography.family.bold }}
                        >
                            Improve your pitch
                        </AppText>
                        <AppText
                            variant="body"
                            color="rgba(0, 0, 0, 0.6)"
                            style={{ textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }}
                        >
                            Train your ear. Hit notes accurately.{'\n'}See real progress.
                        </AppText>
                    </View>
                    <View style={{
                        backgroundColor: '#8896F5',
                        paddingBottom: insets.bottom + spacing.lg,
                        paddingHorizontal: 24,
                    }}>
                        <Button
                            title="Get started"
                            onPress={() => navigation.navigate('Lowest')}
                            style={{ marginTop: spacing.xl, backgroundColor: '#ffffff' }}
                        />
                    </View>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    root: {
        height: '100%',
        width: '100%',
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'absolute',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        // height: '85%',
    },
    bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 24,
    },
});
