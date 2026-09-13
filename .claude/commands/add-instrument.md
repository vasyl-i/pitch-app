# Add a new instrument sound to the app

You are adding a new instrument sample set to the Pitch Coach app's sound system.

## Arguments
- $ARGUMENTS: The instrument name and optionally the path to the sample files folder. Example: "marimba" or "marimba assets/marimba"

## How the sampling system works

The app plays lesson notes using pre-recorded samples + pitch shifting via `detune`.

### Architecture
- `src/shared/audio/pianoSampler.ts` — loads samples, finds nearest sample for any MIDI note, applies `detune` offset in cents
- `src/shared/audio/toneBus.ts` — shared AudioContext, voice scheduling, calls into the sampler
- `src/shared/audio/soundStore.ts` — persisted user preference for sound type (`SoundType` union) and volume
- `react-native-audio-api` — the underlying audio engine (Web Audio API for RN)

### Sample file strategy
17 MP3 files per instrument, one every 3 semitones (C, D#, F#, A per octave), covering C2–C6.
The `detune` param pitch-shifts up to ±1.5 semitones from the nearest sample. This keeps the bundle small (~2 MB per instrument) while sounding natural.

### Required files (per instrument)
Place in `assets/<instrument-name>/`:

| File      | MIDI | Note |
|-----------|------|------|
| C2.mp3    | 36   | C2   |
| Ds2.mp3   | 39   | D#2  |
| Fs2.mp3   | 42   | F#2  |
| A2.mp3    | 45   | A2   |
| C3.mp3    | 48   | C3   |
| Ds3.mp3   | 51   | D#3  |
| Fs3.mp3   | 54   | F#3  |
| A3.mp3    | 57   | A3   |
| C4.mp3    | 60   | C4   |
| Ds4.mp3   | 63   | D#4  |
| Fs4.mp3   | 66   | F#4  |
| A4.mp3    | 69   | A4   |
| C5.mp3    | 72   | C5   |
| Ds5.mp3   | 75   | D#5  |
| Fs5.mp3   | 78   | F#5  |
| A5.mp3    | 81   | A5   |
| C6.mp3    | 84   | C6   |

### Audio file requirements
- Format: MP3, 128–192 kbps
- Sample rate: 44100 Hz
- Channels: Mono
- Duration: 2–3 seconds with natural decay
- Normalized to ~-3 dB peak
- Dry (no reverb/delay) — the app controls gain envelope
- Clean attack (no fade-in) — app adds 30ms attack ramp
- Natural tail decay, no abrupt cutoff

## Steps to implement

1. **Verify sample files exist** in `assets/<instrument-name>/`. Check all 17 files are present with correct names. If files are missing or the folder doesn't exist, tell the user what's missing and stop.

2. **Create a new sampler module** at `src/shared/audio/<instrument>Sampler.ts`:
   - Copy the pattern from `pianoSampler.ts`
   - Update the `SAMPLE_ASSETS` require map to point to the new asset folder
   - Update the exported function names (e.g., `preloadMarimbaSamples`, `scheduleMarimbaNote`, `isMarimbaReady`)
   - Keep the same `nearest()` logic — it works for any 3-semitone-spaced sample set
   - Keep the volume boost factor at 3.0 initially (adjust after testing if needed)

3. **Register the new sound type** in `src/shared/audio/soundStore.ts`:
   - Add the new instrument to the `SoundType` union type
   - Add its label to `SOUND_TYPE_LABELS`

4. **Wire into toneBus.ts**:
   - Import the new sampler's `preload`, `isReady`, and `schedule` functions
   - In the preload flow, add the new instrument's preload call
   - In the note scheduling logic, add a case for the new sound type that calls the new sampler's schedule function

5. **Verify no TypeScript errors**: Run `npm run typecheck`

6. **Tell the user** to test by:
   - Changing the sound type in Settings
   - Playing a lesson or ear training exercise
   - Checking that all octaves sound correct (especially C2, C6 extremes)

## Important notes
- Metro bundler requires **static `require()` paths** — you cannot dynamically construct paths. Each sample must have its own literal `require('../../../assets/<instrument>/X.mp3')` line.
- The `SoundType` is persisted in MMKV. Adding a new value is backward-compatible. Removing one would need a migration.
- The existing piano sampler and oscillator types must remain untouched.
- Follow the import direction: `shared/audio` is in the shared layer, accessible by all features.