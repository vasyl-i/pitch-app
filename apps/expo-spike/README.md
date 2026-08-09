# Phase 2 spike — mobile mic capture + real-time pitch detection

Answers the roadmap question: *can React Native/Expo deliver mic frames fast
enough for live pitch feedback, or do we need a custom native DSP module?*

## What it does

One screen (`App.tsx`), no product UI. Press **Start**:

- requests mic permission (`AudioManager.requestRecordingPermissions`)
- streams raw PCM via `react-native-audio-api`'s `AudioRecorder`
  (preferred: 44.1kHz, 1024-frame callbacks ≈ 23ms hop)
- maintains a 2048-sample rolling window and runs YIN (`yin.ts`, same
  algorithm as the web prototype's AudioWorklet) on every callback
- displays the detected note/cents plus the numbers that decide feasibility:
  - **callback interval** — how often the OS actually delivers audio
  - **YIN compute** — how long detection takes per frame on this device
  - actual buffer size / sample rate granted by the hardware

**Pass criteria** (from ARCHITECTURE.md §4): callback interval ≤ ~46ms and
YIN compute comfortably below the interval, on mid-range hardware. Then the
MVP needs no custom native module — JS-side detection on this lib is enough.

## Findings so far (updated as we learn)

- `react-native-audio-api` (Software Mansion, v0.13) exposes exactly the
  needed primitive: `AudioRecorder.onAudioReady(options, cb)` with Float32
  PCM buffers and configurable buffer length. No custom module needed for
  *capture*. It drags in `react-native-worklets`, `react-native-gesture-handler`
  and `react-native-reanimated` (its media-controls UI imports them) — all
  installed at Expo-SDK-57-compatible versions.
- **Expo Go cannot run this** — the lib is native; a dev build is required
  (`expo-dev-client` / `expo run:ios|android`). Expected per ARCHITECTURE.md.
- YIN on a 2048-sample window @ 44.1kHz: **0.67ms median in Node/V8** on an
  M-series Mac. Hermes on a phone has no JIT, so expect several-fold slower —
  but even 20x leaves headroom inside a 23ms hop. If a real device disproves
  this, first lever: analyze at 16kHz (maxLag drops 630→228, ~10x less work)
  before reaching for a native DSP module.
- **Measured on iOS simulator (iPhone 17, iOS 26.5, M-series Mac, 2026-07-16),
  Hermes:**
  - YIN on the full 2048-sample window @44.1kHz: **~33ms per frame** — 50x
    slower than V8, saturated the JS thread (callback cadence stretched from
    23ms to 33ms; UI lagged; detection felt intermittent). JS-thread YIN at
    full rate is NOT viable on Hermes.
  - After 4x decimation (analyze at 11.025kHz, 512-sample window ≈ same 46ms):
    **YIN ~3.5ms voiced / callback interval 23.1ms** — back to native cadence
    with ~7x headroom. 220Hz test tone detected as A3 −3 cents. **PASS.**
  - UI updates must be throttled (~15fps); setState per audio callback was a
    second source of lag.
  - Two simulator-specific gotchas hit along the way: the *Simulator app*
    needs macOS-level mic permission (TCC) or it delivers pure silence, and
    the silence gate had to drop to 0.002 rms for the simulator's quiet mic
    path.
- ⏳ **Real iPhone numbers still worth capturing** (expected same or better —
  phone Hermes vs simulator Hermes is comparable, and the phone mic is
  louder): needs the Apple ID added in Xcode → Settings → Accounts, then
  `npx expo run:ios --device`.
- If more headroom is ever needed: react-native-worklets is already installed
  (peer dep) — the detector can move off the JS thread entirely, or into the
  lib's custom AudioNode processor. Not required at current numbers.

## How to run it

Node is at `~/.local/node/bin` (add to PATH). Then, from `apps/expo-spike`:

**iOS on your iPhone (recommended — real hardware numbers)**
1. `npm i -g eas-cli && eas login` (free Expo account is fine)
2. `eas build --profile development --platform ios` (first run walks you
   through credentials; requires Apple Developer membership for device builds)
3. Install the build from the QR/link on your phone
4. `npx expo start` on this machine, open the dev build, press **Start**, sing

**iOS simulator (Xcode installed 2026-07-16; CocoaPods at `~/.gem/ruby/2.6.0/bin`)**
1. One-time, needs admin: `sudo xcodebuild -license accept`, then
   `xcodebuild -downloadPlatform iOS` (simulator runtime, ~7GB)
2. `export PATH="$HOME/.local/node/bin:$HOME/.gem/ruby/2.6.0/bin:$PATH"`
3. `npx expo run:ios` — simulator uses the Mac's mic. Numbers are indicative
   only; don't treat simulator latency as the feasibility verdict.

**Android (needs Android Studio + SDK)**
1. `npx expo run:android` with a device in USB-debug mode (or emulator).
   Android audio latency varies a lot by vendor — worth testing on the
   cheapest device we care about.

## What to record when it runs

Note (in this README) the device model + the three numbers from the screen
(callback interval, YIN compute, frames/sec) singing a steady note for ~10s.
That's the go/no-go data for building the phase 4 mobile UI on this stack.
