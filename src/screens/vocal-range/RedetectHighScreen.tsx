import { FlowScreen } from '@/shared/ui';
import { DetectionFlow } from '@/features/vocal-range';
import type { RootScreenProps } from '@/app/navigation/types';

export function RedetectHighScreen({ navigation, route }: RootScreenProps<'RedetectHigh'>) {
  const { low } = route.params;
  return (
    <FlowScreen onBack={navigation.goBack}>
      <DetectionFlow direction="high" onCaptured={(high) => navigation.navigate('RedetectResults', { low, high })} onBack={navigation.goBack} />
    </FlowScreen>
  );
}
