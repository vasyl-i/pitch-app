/**
 * Singing along to an uploaded instrumental, graded against its detected key
 * — chord/key grading per the project's core approach, never a reference
 * vocal.
 *
 * The display is karaoke-style sung-note bars (`KeyTrailView`): each note
 * the singer holds becomes a bar on its nearest in-key lane, colored by
 * accuracy — lime near-perfect, white middling, red off. Nothing draws while
 * the singer is silent, and the score appears only as an end-of-take
 * summary. Frames become notes through the aggregator's sustain requirement,
 * which is also the main defense against the track's own sound being read
 * as singing.
 *
 * Playback deliberately does NOT gate the microphone — same decision as the
 * staff-practice accompaniment stage: a sing-along means capture and playback
 * must overlap. On the loudspeaker the mic also hears the track, which can
 * color the reading; the headphone hint discloses the cheap fix.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { decodeAudioData, type AudioBufferSourceNode } from 'react-native-audio-api';
import { useProfileStore } from '@/entities/profile';
import {
  ACCURACY_COLOR,
  useInstrumentalStore,
  createNoteAggregator,
  gradePitch,
  KeyTrailView,
  noteClass,
  scoreNotes,
  type FormingNote,
  type SungNote,
  type TakeScore,
} from '@/features/instrumental';
import {
  acquireMic,
  annotateLatestFrame,
  CLARITY_MIN_RELIABLE,
  createThrottle,
  createVoiceGate,
  DIAGNOSTICS_AVAILABLE,
  MicPermissionError,
  type MicLease,
} from '@/features/pitch-detection';
import { audioContext, audioNow, watchOutputRoute } from '@/shared/audio';
import { freqToMidi } from '@/shared/lib/music';
import { noteName } from '@/shared/lib/staff';
import { AppText, BackButton, Button, Card, Screen } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import type { RootScreenProps } from '@/app/navigation/types';

const UI_TICK_MS = 66;
/**
 * Pitches this far outside the singer's range are not the singer — on the
 * loudspeaker the mic hears the track itself, and its bassline would
 * otherwise be graded as singing. Generous enough that reaching slightly
 * past the measured range still counts.
 */
const RANGE_SLACK_SEMITONES = 5;
/**
 * Reject frames whose pitch estimate is noise-dominated.
 *
 * This was introduced believing a music mix would read as low-periodicity and
 * so could be filtered out by clarity. Measurement disproved that: a two-tone
 * mix scores 0.99 and a three-tone chord with bass 0.98, against 1.00 for a
 * clean vowel — clarity cannot separate the track from the singer at any
 * threshold (docs/PITCH_ENGINE_AUDIT.md §3 F1). The old 0.60 was below the
 * 0.73 floor and filtered nothing at all.
 *
 * It is kept for what it genuinely does — dropping very breathy, unreliable
 * estimates — and the real defences against the track being graded as singing
 * are the vocal-range filter below, the aggregator's sustain requirement, and
 * headphones.
 */
const CLARITY_MIN = CLARITY_MIN_RELIABLE;

export function InstrumentalSingScreen({ navigation, route }: RootScreenProps<'InstrumentalSing'>) {
  const { palette, spacing } = useTheme();
  const track = useInstrumentalStore((s) => s.tracks.find((t) => t.id === route.params.trackId));

  const [playing, setPlaying] = useState(false);
  const [privateOutput, setPrivateOutput] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [notes, setNotes] = useState<SungNote[]>([]);
  const [forming, setForming] = useState<FormingNote | null>(null);
  const [headMidi, setHeadMidi] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState<TakeScore | null>(null);
  // wall clock driving the scroll; ticking it also re-renders the canvas
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  // lane span: the singer's range when measured, a middle octave otherwise
  const [range] = useState(() => useProfileStore.getState().profile?.trainingRange ?? null);
  const lowMidi = range?.lowMidi ?? 48; // C3
  const highMidi = range?.highMidi ?? 72; // C5

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const leaseRef = useRef<MicLease | null>(null);
  const aggregatorRef = useRef(createNoteAggregator());
  const notesRef = useRef<SungNote[]>([]);

  useEffect(() => watchOutputRoute(setPrivateOutput), []);

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Date.now() / 1000), UI_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!track?.key) return;
    const key = track.key;
    const gate = createVoiceGate();
    const uiTick = createThrottle(UI_TICK_MS);
    let disposed = false;

    const commit = (done: SungNote | null) => {
      if (!done) return;
      notesRef.current.push(done);
      setNotes([...notesRef.current]);
    };

    acquireMic({
      onFrame: (frame) => {
        const now = Date.now();
        const t = now / 1000;
        const midi = frame.frequency === null ? null : freqToMidi(frame.frequency);
        const inRange = midi !== null && midi >= lowMidi - RANGE_SLACK_SEMITONES && midi <= highMidi + RANGE_SLACK_SEMITONES;

        if (frame.clipped || frame.clarity < CLARITY_MIN || !inRange || !gate.accept(frame.rms, midi, now)) {
          commit(aggregatorRef.current.silence(t));
          // folds away entirely in release builds — see lib/diagnostics
          if (DIAGNOSTICS_AVAILABLE) annotateLatestFrame({ voiced: false, source: 'instrumental' });
          if (uiTick(now)) {
            setHeadMidi(null);
            setForming(aggregatorRef.current.forming());
          }
          return;
        }

        gate.confirm(midi!, now);
        // Raw detector pitch into grading and the note aggregator. A pitch
        // smoother used to sit here and fed both scoring and the trail; it was
        // measured as the largest source of user-visible pitch error on real
        // singing. The trail head is a continuous marker, so it takes the raw
        // value too — nothing here quantizes to a note name.
        const verdict = gradePitch(midi!, key);
        commit(aggregatorRef.current.push(t, midi!, verdict.cents));

        if (DIAGNOSTICS_AVAILABLE) {
          annotateLatestFrame({ voiced: true, filteredMidi: midi!, cents: verdict.cents, source: 'instrumental' });
        }

        if (uiTick(now)) {
          setHeadMidi(midi!);
          setForming(aggregatorRef.current.forming());
        }
      },
    })
      .then((lease) => {
        if (disposed) void lease.release();
        else leaseRef.current = lease;
      })
      .catch((err) => {
        setMicError(
          err instanceof MicPermissionError
            ? 'Microphone access is needed to grade your singing.'
            : 'The microphone could not be started.'
        );
      });

    return () => {
      disposed = true;
      void leaseRef.current?.release();
      leaseRef.current = null;
    };
  }, [track?.id, track?.key]);

  const endTake = () => {
    const done = aggregatorRef.current.flush();
    if (done) notesRef.current.push(done);
    setNotes([...notesRef.current]);
    setForming(null);
    setPlaying(false);
    setFinalScore(scoreNotes(notesRef.current));
  };

  const stopPlayback = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    endTake();
  };

  const startPlayback = async () => {
    if (!track || playing) return;
    // a fresh take starts clean
    aggregatorRef.current = createNoteAggregator();
    notesRef.current = [];
    setNotes([]);
    setForming(null);
    setFinalScore(null);
    const ctx = audioContext();
    const buffer = await decodeAudioData(track.uri);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onEnded = endTake;
    source.start(audioNow());
    sourceRef.current = source;
    setPlaying(true);
  };

  useEffect(() => stopPlayback, []);

  if (!track || !track.key) {
    return (
      <Screen>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <AppText variant="body">This track isn’t ready yet.</AppText>
        </View>
      </Screen>
    );
  }

  const liveCls = forming?.cls ?? null;

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" numberOfLines={1}>
            {track.filename}
          </AppText>
          <AppText variant="caption">{track.key.keyName}</AppText>
        </View>
      </View>

      {/* the note being sung right now — name + how it's landing */}
      <View style={[styles.readout, { marginTop: spacing.md }]}>
        <AppText variant="title" color={forming === null ? palette.textFaint : palette.textPrimary} style={styles.note}>
          {forming === null ? '—' : noteName(forming.laneMidi)}
        </AppText>
        <AppText variant="label" color={liveCls === null ? palette.textFaint : ACCURACY_COLOR[liveCls]} style={styles.cents}>
          {forming === null ? '' : `${forming.medianCents > 0 ? '+' : ''}${forming.medianCents}¢`}
        </AppText>
      </View>

      {/* sung-note bars over the key's scale lanes */}
      <KeyTrailView
        notes={notes}
        forming={forming}
        headMidi={headMidi}
        now={nowSec}
        keyName={track.key.keyName}
        lowMidi={lowMidi}
        highMidi={highMidi}
      />

      {!playing && finalScore && (
        <Card style={{ padding: spacing.lg, marginTop: spacing.sm }}>
          <View style={styles.summaryRow}>
            <AppText variant="title" style={{ fontSize: 34 }} color={palette.accent}>
              {finalScore.score}
            </AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="label">Take score</AppText>
              <AppText variant="caption" style={{ marginTop: 2 }}>
                In key {Math.round(finalScore.inKeyFraction * 100)}% of the time · {finalScore.avgCents}¢ average deviation ·{' '}
                {finalScore.notes} {finalScore.notes === 1 ? 'note' : 'notes'}
              </AppText>
            </View>
          </View>
        </Card>
      )}

      {micError && (
        <AppText variant="caption" color={palette.warning} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {micError}
        </AppText>
      )}
      {playing && !privateOutput && (
        <AppText variant="caption" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          Headphones give a truer reading — on the speaker the mic hears the track too.
        </AppText>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button title={playing ? 'Stop track' : 'Play track'} onPress={playing ? stopPlayback : startPlayback} />
        <Button title="Done" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 12, height: 34 },
  note: { fontSize: 26, fontVariant: ['tabular-nums'] },
  cents: { fontSize: 18, fontVariant: ['tabular-nums'] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
