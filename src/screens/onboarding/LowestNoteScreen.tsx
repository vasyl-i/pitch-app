import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow, MicCalibrationGate } from '@/features/vocal-range';
import { MicGlow } from '@/features/staff-practice';
import type { OnboardingScreenProps } from '@/app/navigation/types';

export function LowestNoteScreen({ navigation }: OnboardingScreenProps<'Lowest'>) {
    return (
    <Screen overlay={<MicGlow />}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      {/* scrolls rather than clips — the captured-note panel + Continue/Try again
          buttons can push past the fold on shorter screens otherwise */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <MicCalibrationGate>
          <DetectionFlow direction="low" onCaptured={(low) => navigation.navigate('Highest', { low })} onBack={() => navigation.goBack()} />
        </MicCalibrationGate>
      </ScrollView>
    </Screen>
  );
}
