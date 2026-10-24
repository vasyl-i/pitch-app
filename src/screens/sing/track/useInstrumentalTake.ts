import { useEffect, useRef, useState } from 'react';
import { decodeAudioData, type AudioBufferSourceNode } from 'react-native-audio-api';
import { createNoteAggregator, gradePitch, scoreNotes, type FormingNote, type SungNote, type TakeScore, type useInstrumentalStore } from '@/features/instrumental';
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
import { audioContext, audioNow } from '@/shared/audio';
import { freqToMidi } from '@/shared/lib/music';
import { t } from '@/shared/i18n';

type Track = ReturnType<typeof useInstrumentalStore.getState>['tracks'][number];

export const UI_TICK_MS = 66;
/**
 * Pitches this far outside the singer's range are not the singer — on the
 * loudspeaker the mic hears the track itself, and its bassline would
 * otherwise be graded as singing. Generous enough that reaching slightly
 * past the measured range still counts.
 */
const RANGE_SLACK_SEMITONES = 5;
/**
 * Reject frames whose pitch estimate is noise-dominated. Clarity cannot
 * separate the track from the singer (a music mix scores 0.98–0.99, see
 * docs/PITCH_ENGINE_AUDIT.md §3 F1); it is kept for dropping very breathy,
 * unreliable estimates. The real defences are the range filter above, the
 * aggregator's sustain requirement, and headphones.
 */
const CLARITY_MIN = CLARITY_MIN_RELIABLE;

/**
 * One take over an instrumental: the mic is open for the whole screen
 * (playback deliberately does not gate it — a sing-along overlaps), frames
 * become sung notes graded against the track's key, and playing the track
 * starts a fresh take that is scored when it ends or is stopped.
 */
export function useInstrumentalTake(track: Track | undefined, lowMidi: number, highMidi: number) {
  const [playing, setPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [notes, setNotes] = useState<SungNote[]>([]);
  const [forming, setForming] = useState<FormingNote | null>(null);
  const [headMidi, setHeadMidi] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState<TakeScore | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const leaseRef = useRef<MicLease | null>(null);
  const aggregatorRef = useRef(createNoteAggregator());
  const notesRef = useRef<SungNote[]>([]);

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
        const sec = now / 1000;
        const midi = frame.frequency === null ? null : freqToMidi(frame.frequency);
        const inRange = midi !== null && midi >= lowMidi - RANGE_SLACK_SEMITONES && midi <= highMidi + RANGE_SLACK_SEMITONES;

        if (frame.clipped || frame.clarity < CLARITY_MIN || !inRange || !gate.accept(frame.rms, midi, now)) {
          commit(aggregatorRef.current.silence(sec));
          // folds away entirely in release builds — see lib/diagnostics
          if (DIAGNOSTICS_AVAILABLE) annotateLatestFrame({ voiced: false, source: 'instrumental' });
          if (uiTick(now)) {
            setHeadMidi(null);
            setForming(aggregatorRef.current.forming());
          }
          return;
        }

        gate.confirm(midi!, now);
        // raw detector pitch into grading and the aggregator — a smoother here
        // was measured as the largest source of user-visible pitch error
        const verdict = gradePitch(midi!, key);
        commit(aggregatorRef.current.push(sec, midi!, verdict.cents));
        if (DIAGNOSTICS_AVAILABLE) annotateLatestFrame({ voiced: true, filteredMidi: midi!, cents: verdict.cents, source: 'instrumental' });
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
      .catch((err) => setMicError(err instanceof MicPermissionError ? t('sing.track.micPermission') : t('sing.track.micFailed')));

    return () => {
      disposed = true;
      void leaseRef.current?.release();
      leaseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, track?.key]);

  // stop the track if the screen goes away mid-playback
  useEffect(
    () => () => {
      try {
        sourceRef.current?.stop();
      } catch {
        // already stopped
      }
      sourceRef.current = null;
    },
    [],
  );

  const endTake = () => {
    const done = aggregatorRef.current.flush();
    if (done) notesRef.current.push(done);
    setNotes([...notesRef.current]);
    setForming(null);
    setPlaying(false);
    setFinalScore(scoreNotes(notesRef.current));
  };

  const stop = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    endTake();
  };

  const play = async () => {
    if (!track || playing) return;
    // a fresh take starts clean
    aggregatorRef.current = createNoteAggregator();
    notesRef.current = [];
    setNotes([]);
    setForming(null);
    setFinalScore(null);
    const ctx = audioContext();
    const source = ctx.createBufferSource();
    source.buffer = await decodeAudioData(track.uri);
    source.connect(ctx.destination);
    source.onEnded = endTake;
    source.start(audioNow());
    sourceRef.current = source;
    setPlaying(true);
  };

  return { playing, play, stop, micError, notes, forming, headMidi, finalScore };
}

/** wall-clock seconds, ticking every `ms` — drives the scrolling trail */
export function useWallClock(ms: number) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}
