// Phase 2 feasibility spike (MVP_ROADMAP.md): mic capture + real-time YIN
// pitch detection on-device, no UI polish. The point is the numbers on
// screen — callback interval, detector compute time, end-to-end frame rate —
// measured on real hardware, before any product UI is built on top.

import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { yinPitch } from './yin';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SAMPLE_RATE = 44100;
const HOP = 1024; // preferred frames per callback (~23ms @ 44.1kHz)
// Hermes has no JIT: YIN on a 2048-sample window @44.1kHz measured ~33ms per
// frame on the iOS simulator — it saturated the JS thread. Decimate 4x before
// analysis: same 46ms window, ~16x less work (~2ms), plenty for vocal range.
const DECIMATE = 4;
const ANALYSIS_RATE = SAMPLE_RATE / DECIMATE; // 11025 Hz
const WINDOW = 512; // ~46ms at the decimated rate

interface Stats {
  note: string;
  cents: number | null;
  rms: number;
  callbackMs: number; // avg interval between onAudioReady callbacks
  yinMs: number; // avg YIN compute time
  framesPerSec: number;
  actualBufferLen: number;
  actualSampleRate: number;
}

const EMPTY_STATS: Stats = {
  note: '—',
  cents: null,
  rms: 0,
  callbackMs: 0,
  yinMs: 0,
  framesPerSec: 0,
  actualBufferLen: 0,
  actualSampleRate: 0,
};

export default function App() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const start = useCallback(async () => {
    setError(null);

    const permission = await AudioManager.requestRecordingPermissions();
    console.log('permission initial', permission);
    if (permission !== 'Granted') {
      setError(`mic permission: ${permission}`);
      return;
    }

    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'measurement',
      iosOptions: ['defaultToSpeaker'],
    });
    await AudioManager.setAudioSessionActivity(true);

    const recorder = new AudioRecorder();
    recorderRef.current = recorder;

    // rolling analysis window: WINDOW samples, refreshed every callback
    const window = new Float32Array(WINDOW);
    let filled = 0;

    // latency accounting over the last ~30 callbacks
    let lastCb = 0;
    const cbIntervals: number[] = [];
    const yinTimes: number[] = [];
    // UI throttle: rendering at audio-callback rate (~hundreds/sec) floods the
    // JS thread and delays everything; 15fps is plenty for a readout.
    let lastUiUpdate = 0;
    // once-per-second aggregate to the Metro console for hard measurements
    let secWindow = { frames: 0, voiced: 0, yinSum: 0, yinMax: 0, rmsMax: 0, t0: performance.now() };

    recorder.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: HOP, channelCount: 1 }, (event) => {
      const now = performance.now();
      if (lastCb > 0) {
        cbIntervals.push(now - lastCb);
        if (cbIntervals.length > 30) cbIntervals.shift();
      }
      lastCb = now;

      const raw = event.buffer.getChannelData(0);
      const sr = event.buffer.sampleRate || SAMPLE_RATE;

      // decimate: boxcar-average each group of DECIMATE samples (cheap
      // anti-alias; fine for vocal fundamentals well below the new Nyquist)
      const decLen = Math.floor(raw.length / DECIMATE);
      const input = new Float32Array(decLen);
      for (let i = 0; i < decLen; i++) {
        let sum = 0;
        for (let j = 0; j < DECIMATE; j++) sum += raw[i * DECIMATE + j];
        input[i] = sum / DECIMATE;
      }

      // slide the window left by the new chunk, append at the end
      if (input.length >= WINDOW) {
        window.set(input.subarray(input.length - WINDOW));
        filled = WINDOW;
      } else {
        window.copyWithin(0, input.length);
        window.set(input, WINDOW - input.length);
        filled = Math.min(WINDOW, filled + input.length);
      }
      if (filled < WINDOW) return;

      const { frequency, rms, computeMs } = yinPitch(window, sr / DECIMATE);
      yinTimes.push(computeMs);
      if (yinTimes.length > 30) yinTimes.shift();

      let note = '—';
      let cents: number | null = null;
      if (frequency) {
        const midi = 69 + 12 * Math.log2(frequency / 440);
        const nearest = Math.round(midi);
        note = PITCH_CLASSES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
        cents = Math.round((midi - nearest) * 100);
      }

      secWindow.frames++;
      if (frequency) secWindow.voiced++;
      secWindow.yinSum += computeMs;
      secWindow.yinMax = Math.max(secWindow.yinMax, computeMs);
      secWindow.rmsMax = Math.max(secWindow.rmsMax, rms);
      if (now - secWindow.t0 >= 1000) {
        console.log(
          `[spike] frames=${secWindow.frames}/s voiced=${secWindow.voiced} ` +
            `yinAvg=${(secWindow.yinSum / secWindow.frames).toFixed(2)}ms yinMax=${secWindow.yinMax.toFixed(2)}ms ` +
            `cbAvg=${(cbIntervals.reduce((a, b) => a + b, 0) / (cbIntervals.length || 1)).toFixed(1)}ms ` +
            `rmsMax=${secWindow.rmsMax.toFixed(4)} note=${note}`
        );
        secWindow = { frames: 0, voiced: 0, yinSum: 0, yinMax: 0, rmsMax: 0, t0: now };
      }

      if (now - lastUiUpdate < 66) return; // ~15fps UI refresh
      lastUiUpdate = now;

      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      const cbAvg = avg(cbIntervals);
      setStats({
        note,
        cents,
        rms,
        callbackMs: cbAvg,
        yinMs: avg(yinTimes),
        framesPerSec: cbAvg > 0 ? 1000 / cbAvg : 0,
        actualBufferLen: event.numFrames,
        actualSampleRate: sr,
      });
    });

    recorder.onError((e) => setError(`recorder error: ${JSON.stringify(e)}`));
    await recorder.start();
    setRunning(true);
  }, []);

  // Diagnostic tool: begin capturing immediately so the numbers flow without
  // a tap (also lets automated runs exercise the pipeline).
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.clearOnAudioReady();
      await recorder.stop();
      recorderRef.current = null;
    }
    setRunning(false);
    setStats(EMPTY_STATS);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pitch spike — latency feasibility</Text>

      <Text style={styles.note}>{stats.note}</Text>
      <Text style={styles.sub}>
        {stats.cents === null ? 'no pitch' : `${stats.cents > 0 ? '+' : ''}${stats.cents} cents`}
      </Text>

      <View style={styles.stats}>
        <Row label="callback interval" value={`${stats.callbackMs.toFixed(1)} ms`} />
        <Row label="YIN compute" value={`${stats.yinMs.toFixed(2)} ms`} />
        <Row label="frames / sec" value={stats.framesPerSec.toFixed(1)} />
        <Row label="buffer frames" value={String(stats.actualBufferLen)} />
        <Row label="sample rate" value={`${stats.actualSampleRate} Hz`} />
        <Row label="rms" value={stats.rms.toFixed(4)} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.btn, running && styles.btnStop]} onPress={running ? stop : start}>
        <Text style={styles.btnText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>

      <Text style={styles.hint}>
        Target: callback interval ≤ 46ms and YIN compute well under the interval. If both hold on
        mid-range hardware, no custom native DSP module is needed for the MVP.
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101113',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  note: { color: '#5bf7ff', fontSize: 72, fontWeight: '700', marginTop: 12 },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 16 },
  stats: { alignSelf: 'stretch', gap: 4, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontVariant: ['tabular-nums'] },
  rowValue: { color: '#fff', fontSize: 14, fontVariant: ['tabular-nums'] },
  error: { color: '#ff6d5c', fontSize: 13 },
  btn: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 220,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStop: { backgroundColor: '#ff6d5c' },
  btnText: { color: '#000', fontSize: 16, fontWeight: '500' },
  hint: { color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
