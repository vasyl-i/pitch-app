import { FlowScreen } from '@/shared/ui';
import { DetectionFlow, MicCalibrationGate } from '@/features/vocal-range';
import type { RootScreenProps } from '@/app/navigation/types';

export function RedetectLowScreen({ navigation }: RootScreenProps<'RedetectLow'>) {
  return (
    <FlowScreen onBack={navigation.goBack}>
      <MicCalibrationGate>
        <DetectionFlow direction="low" onCaptured={(low) => navigation.navigate('RedetectHigh', { low })} onBack={navigation.goBack} />
      </MicCalibrationGate>
    </FlowScreen>
  );
}
