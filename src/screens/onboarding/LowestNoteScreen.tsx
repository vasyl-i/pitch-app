import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow, MicCalibrationGate } from '@/features/vocal-range';
import { MicGlow } from '@/features/staff-practice';
import type { OnboardingScreenProps } from '@/app/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/shared/theme';

export function LowestNoteScreen({ navigation }: OnboardingScreenProps<'Lowest'>) {
    const insets = useSafeAreaInsets();

    return (
        <Screen noBottomPadding>
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <BackButton onPress={() => navigation.goBack()}/>
                </View>
                {/* scrolls rather than clips — the captured-note panel + Continue/Try again
          buttons can push past the fold on shorter screens otherwise */}
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.lg }}>
                  <MicCalibrationGate>
                        <DetectionFlow direction="low" onCaptured={(low) => navigation.navigate('Highest', { low })}
                                       onBack={() => navigation.goBack()}/>
                    </MicCalibrationGate>
                  </View>
                </ScrollView>
        </Screen>
    );
}
