import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow } from '@/features/vocal-range';
import { MicGlow } from '@/features/staff-practice';
import type { OnboardingScreenProps } from '@/app/navigation/types';

export function HighestNoteScreen({ navigation, route }: OnboardingScreenProps<'Highest'>) {
  const { low } = route.params;
  return (
    <Screen overlay={<MicGlow />}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <DetectionFlow direction="high" onCaptured={(high) => navigation.navigate('Results', { low, high })} onBack={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}
