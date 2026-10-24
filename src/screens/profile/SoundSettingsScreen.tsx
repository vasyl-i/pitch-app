/**
 * Sound preferences: master volume and oscillator waveform.
 */
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSoundStore, SOUND_TYPE_LABELS, preloadSamples, type SoundType, audioContext, createToneGroup, audioNow } from '@/shared/audio';
import type { ToneGroup } from '@/shared/audio';
import { ChipGroup, Screen, ScreenHeader } from '@/shared/ui';
import { spacing } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';

const VOLUME_LEVELS = [
  { value: 0.25, key: 'quiet' },
  { value: 0.5, key: 'medium' },
  { value: 0.8, key: 'loud' },
  { value: 1.0, key: 'max' },
] as const;

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

export function SoundSettingsScreen({ navigation }: RootScreenProps<'SoundSettings'>) {
  const { t } = useTranslation();
  const volume = useSoundStore((s) => s.volume);
  const soundType = useSoundStore((s) => s.soundType);
  const setVolume = useSoundStore((s) => s.setVolume);
  const setSoundType = useSoundStore((s) => s.setSoundType);
  const preview = usePreview();
  const volumeOptions = VOLUME_LEVELS.map(({ value, key }) => ({ value, label: t(`profile.soundSettings.volume.${key}`) }));
  const soundOptions = (Object.keys(SOUND_TYPE_LABELS) as SoundType[]).map((value) => ({
    value,
    label: SOUND_TYPE_LABELS[value],
  }));

  return (
    <Screen>
      <ScreenHeader title={t('profile.sound')} onBack={navigation.goBack} />
      <View style={styles.body}>
        <ChipGroup
          title={t('profile.soundSettings.volumeTitle')}
          options={volumeOptions}
          selected={[volume]}
          onSelect={(v) => { setVolume(v); preview(); }}
        />

        <ChipGroup
          title={t('profile.soundSettings.instrument')}
          options={soundOptions}
          selected={[soundType]}
          onSelect={(type) => { setSoundType(type); preloadSamples(type).then(() => preview()); }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
});
