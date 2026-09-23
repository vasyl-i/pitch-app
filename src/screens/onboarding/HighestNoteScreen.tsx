import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow } from '@/features/vocal-range';
import { MicGlow } from '@/features/staff-practice';
import type { OnboardingScreenProps } from '@/app/navigation/types';
import { spacing } from '@/shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HighestNoteScreen({ navigation, route }: OnboardingScreenProps<'Highest'>) {
    const { low } = route.params;
    const insets = useSafeAreaInsets();

    return (
        <Screen noBottomPadding>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <BackButton onPress={() => navigation.goBack()}/>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ flex: 1, paddingBottom: insets.bottom + spacing.lg }}>
                    <DetectionFlow direction="high" onCaptured={(high) => navigation.navigate('Results', { low, high })}
                                   onBack={() => navigation.goBack()}/>
                </View>
            </ScrollView>
        </Screen>
    );
}
