import { FlowScreen } from '@/shared/ui';
import { DetectionFlow, MicCalibrationGate } from '@/features/vocal-range';
import type { OnboardingScreenProps } from '@/app/navigation/types';

export function LowestNoteScreen({ navigation }: OnboardingScreenProps<'Lowest'>) {
  return (
    <FlowScreen onBack={navigation.goBack}>
      <MicCalibrationGate>
        <DetectionFlow direction="low" onCaptured={(low) => navigation.navigate('Highest', { low })} onBack={navigation.goBack} />
      </MicCalibrationGate>
    </FlowScreen>
  );
}
