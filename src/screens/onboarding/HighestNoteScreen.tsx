import { FlowScreen } from '@/shared/ui';
import { DetectionFlow } from '@/features/vocal-range';
import type { OnboardingScreenProps } from '@/app/navigation/types';

export function HighestNoteScreen({ navigation, route }: OnboardingScreenProps<'Highest'>) {
  const { low } = route.params;
  return (
    <FlowScreen onBack={navigation.goBack}>
      <DetectionFlow direction="high" onCaptured={(high) => navigation.navigate('Results', { low, high })} onBack={navigation.goBack} />
    </FlowScreen>
  );
}
