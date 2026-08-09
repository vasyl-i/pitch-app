import { ScrollView, View } from 'react-native';
import { BackButton, Screen } from '@/shared/ui';
import { DetectionFlow, MicCalibrationGate } from '@/features/vocal-range';
import type { ProfileScreenProps } from '@/app/navigation/types';

export function RedetectLowScreen({ navigation }: ProfileScreenProps<'RedetectLow'>) {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <MicCalibrationGate>
          <DetectionFlow direction="low" onCaptured={(low) => navigation.navigate('RedetectHigh', { low })} onBack={() => navigation.goBack()} />
        </MicCalibrationGate>
      </ScrollView>
    </Screen>
  );
}
