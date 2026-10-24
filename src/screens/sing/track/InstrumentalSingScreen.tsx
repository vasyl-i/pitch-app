/**
 * Singing along to an uploaded instrumental, graded against its detected key
 * — chord/key grading per the project's core approach, never a reference
 * vocal.
 *
 * The display is karaoke-style sung-note bars (`KeyTrailView`): each note
 * the singer holds becomes a bar on its nearest in-key lane, colored by
 * accuracy. Nothing draws while the singer is silent, and the score appears
 * only as an end-of-take summary. On the loudspeaker the mic also hears the
 * track, which can color the reading; the headphone hint discloses the
 * cheap fix.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useProfileStore } from '@/entities/profile';
import { KeyTrailView, useInstrumentalStore } from '@/features/instrumental';
import { watchOutputRoute } from '@/shared/audio';
import { AppText, BackButton, Button, Screen } from '@/shared/ui';
import { palette, spacing } from '@/shared/theme';
import { formatKeyName, useTranslation } from '@/shared/i18n';
import type { RootScreenProps } from '@/app/navigation/types';
import { UI_TICK_MS, useInstrumentalTake, useWallClock } from './useInstrumentalTake';
import { LiveNote, TakeSummary } from './TakeParts';

export function InstrumentalSingScreen({ navigation, route }: RootScreenProps<'InstrumentalSing'>) {
  const { t } = useTranslation();
  const track = useInstrumentalStore((s) => s.tracks.find((tr) => tr.id === route.params.trackId));
  // lane span: the singer's range when measured, a middle octave otherwise
  const [range] = useState(() => useProfileStore.getState().profile?.trainingRange ?? null);
  const lowMidi = range?.lowMidi ?? 48; // C3
  const highMidi = range?.highMidi ?? 72; // C5
  const take = useInstrumentalTake(track, lowMidi, highMidi);
  const now = useWallClock(UI_TICK_MS);
  const [privateOutput, setPrivateOutput] = useState(false);
  useEffect(() => watchOutputRoute(setPrivateOutput), []);

  if (!track?.key) {
    return (
      <Screen>
        <BackButton onPress={navigation.goBack} />
        <View style={styles.center}>
          <AppText variant="body">{t('sing.track.notReady')}</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={navigation.goBack} />
        <View style={styles.fill}>
          <AppText variant="label" numberOfLines={1}>
            {track.filename}
          </AppText>
          <AppText variant="caption">{formatKeyName(track.key.keyName)}</AppText>
        </View>
      </View>

      <LiveNote forming={take.forming} />
      <KeyTrailView notes={take.notes} forming={take.forming} headMidi={take.headMidi} now={now} keyName={track.key.keyName} lowMidi={lowMidi} highMidi={highMidi} />
      {!take.playing && take.finalScore && <TakeSummary score={take.finalScore} />}

      {take.micError && (
        <AppText variant="caption" color={palette.warning} center style={styles.note}>
          {take.micError}
        </AppText>
      )}
      {take.playing && !privateOutput && (
        <AppText variant="caption" center style={styles.note}>
          {t('sing.track.headphonesHint')}
        </AppText>
      )}

      <View style={styles.actions}>
        <Button title={take.playing ? t('sing.track.stop') : t('sing.track.play')} onPress={take.playing ? take.stop : take.play} />
        <Button title={t('common.done')} variant="ghost" onPress={navigation.goBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fill: { flex: 1 },
  note: { marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
