# Pitch Coach

A singing practice app where users bring their own instrumental track, sing along, and get real-time visual feedback on pitch accuracy against the song's chord/key progression. Target user: beginner-to-intermediate singers.

## Project layout

```
src/            App source (Feature-Sliced Design)
assets/         Fonts, icons, splash images
plugins/        Expo config plugins
scripts/        Python utilities + TS test helpers
docs/           PRD, architecture, design system, legal, roadmap, pitch-detection deep-dives
supabase/       Database migrations
benchmark-corpus/  Pitch detection test audio
patches/        patch-package patches
```

## Tech stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript 6
- Zustand (state management, persisted stores via AsyncStorage)
- React Navigation (native-stack + bottom-tabs, FloatingTabBar)
- react-native-audio-api (mic capture)
- @shopify/react-native-skia (staff rendering, pitch overlay)
- react-native-reanimated 4.5 + react-native-worklets

## App architecture (Feature-Sliced Design)

`src/`:
```
app/        Navigation setup, providers, App.tsx
entities/   Domain models (exercise, profile) -- no UI, shared by features
features/   Feature modules:
            - pitch-detection   (YIN, mic broker, voice gate, signal processing)
            - pitch-visualization (PitchKeyboard, MiniStaff, CentsGauge)
            - learning          (skill tree, spaced repetition, adaptive difficulty)
            - staff-practice    (melody player, staff store, practice loop)
            - ear-training      (listen-and-sing-back drills)
            - instrumental      (user file import & playback)
            - vocal-range       (mic calibration, range detection)
            - progress          (session history, stats, heatmaps)
screens/    Screen components (~48 files, thin composition layers)
shared/     Design system (theme/tokens.ts), UI primitives, utilities
```

Import direction: `app -> screens -> features -> entities -> shared` (no reverse imports)

## Hard constraints -- DO NOT violate

1. **NO vocal separation** (Demucs, UVR, any AI stem splitting) -- deliberate legal exclusion, see `docs/LEGAL_AND_COMPLIANCE.md`
2. **NO pulling audio from Spotify/Apple Music/YouTube** -- DRM/ToS violations
3. **NO reference-melody-matching** against original vocalist's pitch curve -- requires copyrighted vocal processing
4. Grading is against **chord/key progression**, not the original vocalist
5. Raw mic audio **never leaves the device**
6. Never show raw cents/frequency numbers in the free tier UI

## Scoring pipeline

- **Offline (once per track):** chroma extraction on instrumental -> key estimation -> chord segmentation -> timeline JSON `[{start, end, chord, root}]`
- **Real-time:** YIN pitch on mic frames (~20-40ms) -> MIDI note -> pitch class + cents -> classify vs active chord (chord tone / key tone / out-of-key) + stability from cents variance
- **Aggregate:** rolling 0-100 confidence score for live meter

## Design system essentials

- Dark theme: background `#08070C`, lime accent `#C8DA59`, violet `#8B7CFF` (premium only)
- All values in `shared/theme/tokens.ts` -- never hardcode colors/spacing/fonts
- Font: **Satoshi** (Regular, Medium, Bold, Black) -- always set `fontFamily` explicitly, `fontWeight` alone doesn't work
- No borders on cards -- use translucent fill + soft shadow
- Sentence case everywhere (no `.toUpperCase()`)
- `IconBubble` for all list-row icons, plain glyphs only (not `-circle` variants)
- See `docs/DESIGN_SYSTEM.md` for full reference

## Commands

```bash
npm start               # Expo dev server
npm run ios             # Run on iOS simulator
npm run android         # Run on Android emulator
npm run typecheck       # TypeScript checking
npm run test            # Run tests
npm run benchmark       # Pitch detection benchmark suite
npm run benchmark:check # Check against committed baselines
```

## Expo 57 -- READ THIS

Expo has changed significantly. Read versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any Expo-specific code. Do NOT rely on pre-training knowledge of older Expo versions.

## Key gotchas

- **Satoshi font weight:** use `fontFamily: typography.family.bold`, NOT `fontWeight: '700'`
- **Filled Ionicons in IconBubble:** use plain glyphs (`play`), not `play-circle`
- **fontSize without lineHeight:** always set both together when overriding size
- **Metro Fast Refresh:** can serve stale renders on color-only changes -- force-terminate and relaunch app
- **Mic ownership:** `micBroker.acquireMic()` grants exclusive lease -- only one feature records at a time
- **Vocal profile ranges:** always read `trainingRange` (not `maximumRange` or `comfortRange`) for content fitting
- **Tolerance bands:** defined once in `shared/lib/music.ts` (`PERFECT_CENTS`, `SLIGHT_CENTS`, `NOTICEABLE_CENTS`)

## Detailed docs

- `docs/PRD.md` -- product requirements
- `docs/ARCHITECTURE.md` -- system design, platform choices, technical risks
- `docs/DESIGN_SYSTEM.md` -- complete design tokens & component catalog
- `docs/LEGAL_AND_COMPLIANCE.md` -- copyright strategy, licensing boundaries
- `docs/MVP_ROADMAP.md` -- phased build order (currently at end of Phase 2)
- `docs/PITCH_BENCHMARK.md` -- pitch detection benchmark analysis
- `docs/PITCH_SMOOTHER_ANALYSIS.md` -- pitch smoother deep-dive
- `docs/PITCH_ERROR_ANALYSIS.md` -- error analysis
