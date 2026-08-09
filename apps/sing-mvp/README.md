# Sing MVP

A React Native (Expo) app that helps singers see exactly how accurately they
sing every note.

**Practice** shows a target melody on a musical staff, plays it as a reference,
and draws your voice live on a layer above the score: on pitch sits on the
note in cyan, sharp drifts above, flat below, with the deviation in cents and a
✓ / △ / ▽ / ✕ verdict per note, then a phrase score. **Ear training** drills
listen-and-sing-back, chord roots, and major/minor recognition.

All audio is processed on-device; nothing is uploaded. Content is public-domain
melodies and original exercises — no copyrighted commercial recordings.

Built with Expo SDK 57 (React Native 0.86), React Navigation, Zustand, Skia for
the staff rendering, and `react-native-audio-api` for real-time microphone
capture. Pitch detection is a pure-TypeScript YIN implementation running on a
4x-decimated signal so it stays fast on Hermes (~12 ms hop; see
`src/features/pitch-detection/lib/`).

> **Important:** this app uses a native audio module, so it **cannot run in
> Expo Go**. You always need a development build (instructions below — the
> `npx expo run:ios` flow creates one automatically).

---

## 1. First-time environment setup (macOS)

Everything below is copy-pasteable into Terminal, in order. Skip any step you
already have. Expect ~1–2 hours total on a clean machine, most of it Xcode
download time.

### 1.1 Xcode (required for the iOS app)

1. Install **Xcode** from the Mac App Store (search "Xcode"). It is a ~12 GB
   download — start it first and continue with the steps below while it runs.
2. When installed, accept the license and point the command-line tools at it:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

3. Download the iOS simulator runtime (~8 GB):

```bash
xcodebuild -downloadPlatform iOS
```

4. Verify:

```bash
xcodebuild -version          # prints Xcode version
xcrun simctl list runtimes   # must list an iOS runtime
```

### 1.2 Homebrew (package manager)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then follow the "Next steps" the installer prints (it tells you to add brew
to your PATH — usually):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 1.3 Node.js (via nvm, so versions are switchable)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install --lts
nvm use --lts
```

Verify (any Node ≥ 20 is fine for Expo SDK 57):

```bash
node -v
npm -v
```

> Note for this repository's original dev machine: Node was installed without
> nvm at `~/.local/node/bin` — if `node` is not found there, run
> `export PATH="$HOME/.local/node/bin:$PATH"` instead of the nvm steps.

### 1.4 Watchman (file watcher — recommended by React Native)

```bash
brew install watchman
```

### 1.5 CocoaPods (iOS dependency manager)

```bash
brew install cocoapods
pod --version
```

> If you can't use Homebrew, the fallback is `sudo gem install cocoapods`
> (system Ruby on older macOS may require pinning old gem versions — prefer
> the brew install).

### 1.6 Project dependencies

```bash
cd "<path-to-repo>/apps/sing-mvp"
npm install
```

---

## 2. Running the app

### 2.1 iOS simulator (fastest first run)

One command builds the native app, installs it on a simulator, starts the
Metro dev server, and launches it:

```bash
npx expo run:ios
```

The first build takes 5–15 minutes (compiling React Native); subsequent runs
are fast. When the app opens, press **Practice melodies**, pick an exercise,
and sing along with the reference — your pitch appears live on the staff.

> **Simulator microphone:** the simulator uses your Mac's microphone. macOS
> will ask for microphone permission for the *Simulator* app the first time —
> click **Allow**. If you accidentally denied it: System Settings → Privacy &
> Security → Microphone → enable "Simulator", or reset the prompt with
> `tccutil reset Microphone com.apple.iphonesimulator` and relaunch.

### 2.2 Your iPhone (real hardware)

1. Add your Apple ID in Xcode: **Xcode → Settings → Accounts → "+"** (a free
   Apple account works; apps re-sign every 7 days on the free tier).
2. On the iPhone: **Settings → Privacy & Security → Developer Mode → on**
   (the phone restarts).
3. Connect the iPhone with a cable, unlock it, tap **Trust This Computer**.
4. Build to the device:

```bash
npx expo run:ios --device
```

Pick your phone from the list. If Xcode complains about signing, open
`ios/SingMVP.xcworkspace` in Xcode once, select the SingMVP target → Signing &
Capabilities → check **Automatically manage signing** and pick your team.

### 2.3 Android

1. Install Android Studio: <https://developer.android.com/studio> (or
   `brew install --cask android-studio`).
2. In Android Studio's setup wizard install the **Android SDK**, **SDK
   Platform-Tools**, and an **Android Virtual Device** (emulator).
3. Add the SDK to your shell:

```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zprofile
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator' >> ~/.zprofile
source ~/.zprofile
```

4. Start an emulator (or connect a device with USB debugging enabled), then:

```bash
npx expo run:android
```

### 2.4 Day-to-day development

After the first native build you usually only need the JS dev server:

```bash
npx expo start
```

…then open the already-installed app on the simulator/device — it connects to
Metro and hot-reloads your changes. A fresh native build is only needed when
native dependencies or `app.json` plugins change:

```bash
npx expo prebuild --platform ios --clean   # regenerate ios/ from config
npx expo run:ios                           # rebuild + launch
```

---

## 3. Project structure

Feature-sliced architecture: screens compose features; features own their
state and logic; `shared` holds the design system primitives. Import
direction is strictly downward (app → screens → features → shared).

```
src/
  app/                        # application shell
    App.tsx                   # providers: gesture handler, safe area, theme, navigation
    navigation/
      RootNavigator.tsx       # Onboarding (first launch only) → tabs Home / Progress / Journey / Profile,
                              #   plus full-screen root sessions (EarSession, MelodyPractice, PracticeComplete)
      types.ts                # typed param lists for stack + tabs
  entities/                   # domain models — shared by features, own no UI
    exercise/                 # target melodies: the content and what it means to sing them
      types.ts                # Exercise, TargetNote
      library.ts              # ← bundled public-domain melodies + warm-ups
      transpose.ts            # fit a melody into a singer's range
      evaluation.ts           # per-note verdicts, phrase scoring, streaming evaluator
    profile/                  # the singer: VocalProfile (maximum/comfort/training range,
      model/profileStore.ts   # confidence, temporary reduction), persisted with a migration
      lib/comfort.ts           # from the old flat shape. lib/rangeLearning.ts: "smart range
      lib/rangeLearning.ts     # learning" — suggests expanding the range, never auto-applies
      lib/range.ts             # voice type, comfortable prompt register
  screens/                    # thin composition layers
    onboarding/               # first-launch flow: welcome, why it matters, low/high, results, goals
    home/                     # Today: the guided daily practice hub — one Continue CTA
    session/                  # full-screen practice sessions + the guided lesson flow (lessonFlow.ts)
    journey/                  # what you've learned: abilities + milestones (read-model over the skill tree)
    progress/                 # stats dashboard, weekly review, perfect runs
    profile/                  # profile hub + learning preferences
    library/                  # free-practice sandbox (everything browsable, nothing required)
    staff-practice/           # staff screen + phrase summary card
    vocal-range/              # settings hub + "run detection again" re-entry screens
  features/
    pitch-detection/          # audio INPUT foundation — all listening goes through here
      lib/pitchEngine.ts      # mic capture, FIR decimation, sliding window, clip/interruption detection (no React)
      lib/yin.ts              # YIN pitch detector (pure TS) — frequency, rms, clarity (confidence)
      lib/micBroker.ts        # exclusive, serialized mic ownership (acquireMic)
      lib/signal.ts           # voice gate, pitch smoother, sustain/stability trackers, vibrato detector, UI throttle
    pitch-visualization/      # shared live-pitch UI: piano keyboard, single-note staff, cents gauge, confidence meter
    staff-practice/           # the main practice experience
      lib/melodyPlayer.ts     # oscillator reference playback (supports slow rate)
      model/staffStore.ts     # Zustand: playhead, live pitch, verdicts, summary
      model/useStaffSession.ts# orchestration: play + capture + grade + feed range learning
      ui/StaffView.tsx        # Skia staff, targets, sung overlay, playhead
      ui/PianoKeyboard.tsx    # thin wrapper over pitch-visualization's PitchKeyboard
      ui/LiveReadout.tsx      # note name, cents, optional Hz
    ear-training/             # listen-and-sing-back drills
    vocal-range/              # mic calibration + guided low/high detection engine + its UI
    progress/                 # persisted history, stars, streaks, heatmap
  shared/
    audio/toneBus.ts          # audio OUTPUT foundation: one context + voice scheduler
    lib/music.ts              # pitch naming, freq ↔ MIDI, cents, tolerance bands, colorForCents
    lib/staff.ts              # MIDI → treble-clef staff geometry (used by staff-practice AND pitch-visualization)
    lib/sessionGuard.ts       # generation guard for async session lifecycles
    theme/
      tokens.ts               # ← design tokens: palette, spacing, radii, typography
      ThemeProvider.tsx       # context provider + useTheme()
    ui/                       # atoms (AppText, Button, BackButton, Screen)
plugins/
  with-spaces-in-path-fix.js  # Expo config plugin (see Troubleshooting)
```

### The five foundations

New practice modes are meant to be assembled from these rather than
reimplemented. Each one exists because it was previously duplicated (or
missing) across the modes we already have.

| Need | Use | Never |
| --- | --- | --- |
| Listen to the singer | `acquireMic()` from `@/features/pitch-detection` | construct a `PitchEngine` — it breaks the one-recorder invariant |
| Clean up raw pitch | `createVoiceGate` / `createPitchSmoother` / `createSustainTracker` / `createStabilityTracker` / `createVibratoDetector` / `createThrottle` | re-derive gating or smoothing inline in a hook |
| Show live pitch | `PitchKeyboard` / `MiniStaff` / `CentsGauge` / `ConfidenceMeter` from `@/features/pitch-visualization` | re-derive keyboard/staff geometry per screen |
| Play reference audio | `createToneGroup()` from `@/shared/audio` | build an `AudioContext` — one is shared, and closing it kills everyone's audio |
| Score a performance | `createPhraseEvaluator` / `gradePhrase` from `@/entities/exercise` | write a second definition of "in tune" |
| Record what happened | `buildAttemptRecord` from `@/features/progress` | write to the session store directly |

**Mic ownership.** The device has one recorder, and tab screens stay mounted
after you navigate away, so overlapping sessions are the default hazard rather
than an edge case. `acquireMic` grants one lease at a time: acquiring releases
the incumbent, a pre-empted lease stops delivering frames immediately, and
every start/stop is serialized so the recorder is never mid-transition when
the next call arrives. It also surfaces OS audio interruptions (phone calls,
Siri) and reactivates the session automatically when they end.

**Tolerance bands.** `PERFECT_CENTS` / `SLIGHT_CENTS` / `NOTICEABLE_CENTS` in
`shared/lib/music.ts`, plus the `colorForCents` helper built on them, are the
single definition of "in tune" vs "close" vs "noticeably off" vs "out of tune"
— and its one color mapping. Melody grading, the staff overlay colours, the
live readout, vocal-range detection and ear-training sing-back all read them,
so the same sung note can't be judged two ways on two screens.

**Vocal profile.** `entities/profile`'s `VocalProfile` distinguishes
`maximumRange` (the widest extremes ever detected), `comfortRange` (day-to-day
default, hand-editable in settings) and `trainingRange` (what exercises
actually fit to — `comfortRange` minus any active temporary reduction). Read
`trainingRange`, never `comfortRange` directly, when deciding what content to
generate or transpose.

### Swapping in the real design system later

All visual values live in `src/shared/theme/tokens.ts` — components never
hardcode colors/sizes. To rebrand: edit the token values, or construct an
alternative `Theme` object and pass it to `<ThemeProvider theme={...}>` in
`src/app/App.tsx`. Custom fonts: load them (e.g. `expo-font`) and set
`typography.fontFamily` — every text component follows automatically.

### State management

Zustand throughout. Each feature owns its own store (`staffStore`,
`earTrainingStore`), and the two stores that must survive a restart —
`entities/profile` and `features/progress` — use the `persist` middleware over
AsyncStorage.

Note the deliberate throttling between audio and React: frames arrive ~43x/sec
but stores are written at 30fps or less, because updating React state at audio
rate lags the JS thread (measured in the phase 2 feasibility spike,
`apps/expo-spike`). Use `createThrottle` for this rather than hand-rolling a
`lastUpdate` timestamp — the rate limit is a real constraint, not a detail.

---

## 4. Adding practice content

Exercises live in `src/entities/exercise/library.ts` as plain data — a list of
target notes (`midi`, `start`, `duration`, optional `lyric`) plus metadata
(title, source, key, bpm, category, difficulty). Hand-authoring short melodies
there is the quickest route.

For real scores, two converters turn standard files into that note format
(pure stdlib Python, no dependencies):

```bash
# Standard MIDI File -> exercise notes (picks the melody line automatically)
python3 scripts/midi_to_exercise.py song.mid out.json
python3 scripts/midi_to_exercise.py song.mid out.json --track 2   # force a track

# MusicXML (.musicxml/.xml/.mxl) -> exercise notes
python3 scripts/musicxml_to_exercise.py score.musicxml out.json
python3 scripts/musicxml_to_exercise.py score.mxl out.json --part P2
```

Both print a summary (note count, duration, range, BPM) and emit
`{ bpm, notes: [...] }`. Paste `notes` into a new entry in `library.ts`.

- **MIDI**: honors tempo maps, and pulls a monophonic "skyline" (highest
  sounding pitch) out of polyphonic files.
- **MusicXML**: handles divisions changes, rests, ties (merged), chords (keeps
  the top note), accidentals, lyrics, and multi-part scores.

**Content policy:** ship only public-domain melodies, original exercises, or
material you hold rights to — the app deliberately requires no copyrighted
commercial recordings.

## 5. Troubleshooting

**"Cannot run in Expo Go" / app crashes instantly in Expo Go**
Expected — the audio module is native. Use `npx expo run:ios` (dev build).

**Build error mentioning `/Users/<you>/Pitch: No such file or directory`**
The repo path contains a space ("Pitch app"), which two Expo/RN build scripts
mishandle. `plugins/with-spaces-in-path-fix.js` patches both automatically on
every `expo prebuild`. If you see this error anyway, re-run
`npx expo prebuild --platform ios --clean`, and check the plugin is listed in
`app.json` → `expo.plugins`.

**Note never appears / always silent on the simulator**
The *Simulator app* needs macOS microphone permission (see §2.1). Also check
the simulator menu **I/O → Audio Input**.

**`pod: command not found`**
CocoaPods isn't installed or not on PATH — revisit §1.5.

**`xcodebuild: error: ... requires Xcode`**
Command-line tools are pointing at the CLT stub, not Xcode — run the
`xcode-select` command from §1.1.

**Metro port 8081 already in use**
`npx expo start --port 8082`, or kill the other process:
`lsof -ti:8081 | xargs kill`.

**Stale native build after dependency changes**
`npx expo prebuild --platform ios --clean && npx expo run:ios`.

---

## 6. What's deliberately not here yet

Built so far: the staff practice loop (target melody, live pitch overlay,
per-note verdicts, phrase score), training tools (loop, slow playback, piano
keyboard, Hz readout), ear training, and the MIDI/MusicXML content pipeline.

Still to come:

- **Progress & gamification** — session history, improvement over time, weekly
  accuracy stats, a heatmap of notes you consistently sing sharp or flat,
  stars, unlockable harder exercises. Needs on-device persistence.
- **In-app file import** — picking MIDI/MusicXML from the device (the
  converters exist; this needs `expo-document-picker` and a native rebuild).
- **Loop a selected measure/range** rather than the whole phrase, which needs a
  measure model in the exercise data.
- **Standalone tuner mode.**
- Backend, accounts, and any Pro tier (see `docs/MVP_ROADMAP.md`) — the app is
  fully on-device today.
