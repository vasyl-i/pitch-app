import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore, voiceType } from '@/entities/profile';
import { PitchKeyboard } from '@/features/pitch-visualization';
import { RangeBar } from '@/features/vocal-range';
import { midiToName } from '@/shared/lib/music';
import { AppText, BackButton, Button, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { ProfileScreenProps } from '@/app/navigation/types';

type EditingEdge = 'low' | 'high' | null;

/**
 * Settings hub for the measured vocal range: view the current profile, hand-
 * edit either edge on a piano keyboard, re-run detection, reset to the last
 * detected values, or temporarily shrink the range for an off day.
 */
export function VocalRangeSettingsScreen({ navigation }: ProfileScreenProps<'VocalRangeSettings'>) {
  const { palette, spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const setComfortRange = useProfileStore((s) => s.setComfortRange);
  const resetToDetected = useProfileStore((s) => s.resetToDetected);
  const setTemporaryAdjustment = useProfileStore((s) => s.setTemporaryAdjustment);
  const [editing, setEditing] = useState<EditingEdge>(null);

  if (!profile) {
    return (
      <Screen>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <AppText variant="label">Vocal range</AppText>
        </View>
        <View style={styles.emptyCenter}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            You haven’t measured your vocal range yet.
          </AppText>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title="Measure my range" onPress={() => navigation.navigate('RedetectLow')} />
          </View>
        </View>
      </Screen>
    );
  }

  const keyboardLow = profile.maximumRange.lowMidi - 3;
  const keyboardHigh = profile.maximumRange.highMidi + 3;
  const isReduced = profile.trainingRange.lowMidi !== profile.comfortRange.lowMidi || profile.trainingRange.highMidi !== profile.comfortRange.highMidi;

  const pickNote = (m: number) => {
    if (editing === 'low') setComfortRange({ lowMidi: Math.min(m, profile.comfortRange.highMidi - 3), highMidi: profile.comfortRange.highMidi });
    else if (editing === 'high') setComfortRange({ lowMidi: profile.comfortRange.lowMidi, highMidi: Math.max(m, profile.comfortRange.lowMidi + 3) });
    setEditing(null);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <AppText variant="label">Vocal range</AppText>
        </View>

        <Card style={[styles.card, { marginTop: spacing.lg }]}>
          <AppText variant="caption">Comfortable range</AppText>
          <AppText variant="title" style={{ fontSize: 24, marginTop: 4 }}>
            {midiToName(profile.comfortRange.lowMidi)} – {midiToName(profile.comfortRange.highMidi)}
          </AppText>
          <View style={{ marginTop: spacing.md }}>
            <RangeBar lowMidi={profile.maximumRange.lowMidi} highMidi={profile.maximumRange.highMidi} currentMidi={null} />
          </View>
          <AppText variant="caption" style={{ marginTop: spacing.sm }}>
            ≈{voiceType(profile.comfortRange)} · {Math.round(profile.confidence * 100)}% confidence · measured{' '}
            {new Date(profile.detectedAt).toLocaleDateString()}
          </AppText>
          {isReduced && (
            <AppText variant="caption" color={palette.warning} style={{ marginTop: spacing.sm }}>
              Temporarily reduced to {midiToName(profile.trainingRange.lowMidi)} – {midiToName(profile.trainingRange.highMidi)} for today
            </AppText>
          )}
        </Card>

        <AppText variant="caption" style={{ marginTop: spacing.xl }}>
          {editing ? `Tap the ${editing === 'low' ? 'lowest' : 'highest'} note you want to use` : 'Edit manually'}
        </AppText>
        <View style={{ marginTop: spacing.md }}>
          <PitchKeyboard
            lowMidi={keyboardLow}
            highMidi={keyboardHigh}
            liveMidi={null}
            targetMidi={editing === 'low' ? profile.comfortRange.lowMidi : editing === 'high' ? profile.comfortRange.highMidi : null}
            onPressKey={editing ? pickNote : undefined}
          />
        </View>
        <View style={[styles.editRow, { marginTop: spacing.sm }]}>
          <EditToggle label="Edit lowest" active={editing === 'low'} onPress={() => setEditing(editing === 'low' ? null : 'low')} />
          <EditToggle label="Edit highest" active={editing === 'high'} onPress={() => setEditing(editing === 'high' ? null : 'high')} />
        </View>

        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Button title="Run detection again" onPress={() => navigation.navigate('RedetectLow')} />
          <Button title="Reset to detected values" variant="ghost" onPress={resetToDetected} />
        </View>

        <AppText variant="caption" style={{ marginTop: spacing.xl }}>
          Feeling off today?
        </AppText>
        <AppText variant="body" style={{ marginTop: 4 }}>
          Temporarily narrow your training range if your voice is tired or you’re under the weather. Exercises will avoid your extremes until
          you clear it.
        </AppText>
        <View style={[styles.editRow, { marginTop: spacing.md }]}>
          <EditToggle label="Tired" active={profile.temporaryAdjustment?.reason === 'tired'} onPress={() => setTemporaryAdjustment({ insetSemitones: 2, reason: 'tired', setAt: Date.now() })} />
          <EditToggle label="Sick" active={profile.temporaryAdjustment?.reason === 'sick'} onPress={() => setTemporaryAdjustment({ insetSemitones: 4, reason: 'sick', setAt: Date.now() })} />
        </View>
        {profile.temporaryAdjustment && (
          <Button title="Back to normal" variant="ghost" onPress={() => setTemporaryAdjustment(null)} style={{ marginTop: spacing.md }} />
        )}
      </ScrollView>
    </Screen>
  );
}

function EditToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { palette, radii, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        { borderRadius: radii.pill, paddingHorizontal: spacing.lg, backgroundColor: palette.surface },
        active && { backgroundColor: 'rgba(200, 218, 89, 0.16)' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name="musical-note" size={14} color={active ? palette.accent : palette.textFaint} />
      <AppText variant="caption" color={active ? palette.accent : palette.textFaint} style={{ marginLeft: 6 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 18 },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  editRow: { flexDirection: 'row', gap: 10 },
  toggle: { flexDirection: 'row', height: 38, alignItems: 'center', justifyContent: 'center' },
});
