# Architecture — Pitch Coach App (MVP)

## 1. Platform strategy: one codebase, two targets

Given the need to ship both desktop and mobile without a large team, avoid building three separate native apps. Recommended split, matched to a React/JS-leaning skill set:

- **Mobile (iOS + Android)**: React Native + Expo. Gets you both app stores from one codebase. Expo's managed workflow is the fastest path to a store-ready build; you'll likely need a custom dev client (still supported by Expo) once you add native audio modules.
- **Desktop (macOS + Windows)**: Tauri wrapping a React web build. Tauri is lighter-weight than Electron (smaller binary, better resource usage) and works fine here since the app isn't doing anything Electron-only APIs would be needed for.
- **Shared code**: pull the non-platform-specific logic — chord/key display components, scoring math, API client, session data models — into a shared package (e.g. a `packages/core` workspace) that both the Expo app and the Tauri/React app import. Only the audio-capture layer and the native shell differ per platform.

This is a reasonable default, not a mandate — if you already have a strong opinion (e.g. Flutter), the rest of this document still applies, only the UI layer changes.

## 2. High-level system

```
[User's instrumental file]
        |
        v
[Upload API] --> [Chord/key analysis worker] --> [Chord/key timeline, stored]
        |
[Client app] <---- fetches timeline for playback session
        |
[Mic input, live] --> [On-device pitch tracker] --> [Local scoring against timeline]
        |
[Live UI meter]                [Session stats] --> [Session storage]
                                                        |
                                              (Pro only) [Claude API] --> [Written summary]
```

Two things to notice: pitch tracking and scoring happen **on-device**, not server-side — this keeps the live feedback loop fast (no round-trip latency) and keeps raw mic audio off your servers entirely, which is good for both privacy and legal posture. Only the aggregated session stats (not audio) go to the backend, and only compact structured data (not audio, not raw frame data) goes to the Claude API for the Pro summary.

## 3. Backend components

- **Auth + user accounts**: standard email/OAuth, whatever your auth provider of choice is (Clerk, Auth0, Supabase Auth all fine here — pick based on what's fastest to wire up, this isn't a differentiated part of the product).
- **Instrumental upload + storage**: object storage (S3-compatible). Store only the instrumental the user explicitly chose to keep in their library — nothing derived from a vocal track.
- **Chord/key analysis worker**: a background job (queue-based — SQS/Cloud Tasks/similar) that runs chroma extraction + key/chord segmentation once per uploaded track and writes a small JSON timeline back. Python is the natural choice here (librosa or Essentia) even if the rest of your stack is JS — run it as a separate service the upload API calls into.
- **Session stats storage**: per-session aggregate stats (in-key %, stability regions, timestamps) — small, structured, cheap to store in a normal relational DB (Postgres).
- **Claude API integration**: server-side call (never expose your API key client-side) that takes the session stats JSON and returns the written summary, cached against the session so it's not regenerated on every view.

## 4. Client-side audio pipeline

### Pitch tracking
Real-time YIN (or a WASM port of it) running on buffered mic input, ~20-40ms frames. On React Native this typically means a native audio module (e.g. via `react-native-audio-api` or a custom native module) since JS-level audio processing at this latency is a known pain point on mobile — budget real engineering time here, it's the highest-risk technical piece of the MVP. On the Tauri/desktop side, the Web Audio API (available in the webview) handles this natively and is much less friction.

### Scoring
Frame-level pitch class + cents-offset compared against the active chord/key at that timestamp (pulled from the pre-computed timeline). Aggregate into a rolling confidence score for the live meter; store raw per-session aggregates (not per-frame) for the recap and Pro summary.

## 5. Key technical risks to flag before committing to a timeline
1. **Real-time audio latency on mobile** — this is the part most likely to blow your MVP timeline. Prototype this first, in isolation, before building anything else.
2. **Chord/key detection accuracy** varies a lot by genre and mix density — test against a real, varied sample of instrumentals early, not just clean pop tracks.
3. **App store review risk** tied to audio-import features — see `LEGAL_AND_COMPLIANCE.md`.

## 6. Suggested build order
See `MVP_ROADMAP.md` for the phased plan — don't start with the full cross-platform build; validate the core pitch-tracking + scoring loop as a single web prototype first.
