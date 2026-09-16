/**
 * Sound preferences: master volume and oscillator waveform.
 */
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useSoundStore, SOUND_TYPE_LABELS, preloadSamples, type SoundType, audioContext, createToneGroup, audioNow } from '@/shared/audio';
import type { ToneGroup } from '@/shared/audio';
import { AppText, BackButton, ChipGroup, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

const VOLUME_OPTIONS = [
  { value: 0.25, label: 'Quiet' },
  { value: 0.5, label: 'Medium' },
  { value: 0.8, label: 'Loud' },
  { value: 1.0, label: 'Max' },
];

const SOUND_OPTIONS = (Object.entries(SOUND_TYPE_LABELS) as [SoundType, string][]).map(([value, label]) => ({
  value,
  label,
}));

/** Play a short C4 preview note using current sound prefs. */
function usePreview() {
  const groupRef = useRef<ToneGroup | null>(null);
  return useCallback(async () => {
    groupRef.current?.cancel();
    // Resume the AudioContext if it was suspended after an exercise session
    const ctx = audioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const g = createToneGroup({ claimsSpeaker: false });
    g.schedule({ midi: 60, at: audioNow(), duration: 0.6, volume: 0.65 });
    groupRef.current = g;
  }, []);
}

export function SoundSettingsScreen({ navigation }: ProfileScreenProps<'SoundSettings'>) {
  const { spacing } = useTheme();
  const volume = useSoundStore((s) => s.volume);
  const soundType = useSoundStore((s) => s.soundType);
  const setVolume = useSoundStore((s) => s.setVolume);
  const setSoundType = useSoundStore((s) => s.setSoundType);
  const preview = usePreview();

  return (
    <Screen>
      <BackButton onPress={navigation.goBack} />
      <AppText variant="title" style={{ marginTop: spacing.md }}>
        Sound
      </AppText>

      <View style={{ marginTop: spacing.lg }}>
        <ChipGroup
          title="Volume"
          options={VOLUME_OPTIONS}
          selected={[volume]}
          onSelect={(v) => { setVolume(v); preview(); }}
        />

        <ChipGroup
          title="Instrument sound"
          options={SOUND_OPTIONS}
          selected={[soundType]}
          onSelect={(t) => { setSoundType(t); preloadSamples(t).then(() => preview()); }}
        />
      </View>
    </Screen>
  );
}
