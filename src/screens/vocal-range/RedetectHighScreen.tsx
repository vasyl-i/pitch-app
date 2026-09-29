import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow } from '@/features/vocal-range';
import type { RootScreenProps } from '@/app/navigation/types';

export function RedetectHighScreen({ navigation, route }: RootScreenProps<'RedetectHigh'>) {
  const { low } = route.params;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <DetectionFlow direction="high" onCaptured={(high) => navigation.navigate('RedetectResults', { low, high })} onBack={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}
