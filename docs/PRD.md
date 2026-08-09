# Product Requirements Document — Pitch Coach App (MVP)

## 1. One-line pitch
A practice app where singers bring their own instrumental track, sing along, and get real-time visual feedback on whether they're in key and singing steadily — with a Pro tier that turns a session into a written coaching summary.

## 2. Target user
Beginner-to-intermediate singers who want low-stakes, private practice feedback. Not aimed at professional vocal training or pitch-perfect competitive grading — the audience explicitly does not need (and shouldn't be shown) cent-level precision against an original recording.

## 3. Core legal constraint (read this first)
The app never processes, stores, or plays back copyrighted vocal/master recordings. Users bring their own instrumental ("minus") track, sourced however they like, outside the app. The app never performs vocal separation itself. See `LEGAL_AND_COMPLIANCE.md` for the full reasoning — this constraint drives several product decisions below, so don't relax it without re-reading that doc.

## 4. MVP feature set

### Must-have (v1.0)
- **Import an instrumental track** (file upload, common formats: mp3, wav, m4a)
- **One-time analysis**: key detection + chord timeline extraction from the instrumental (chroma-based, server-side)
- **Playback with live mic capture**: user plays the instrumental and sings along, mic is captured in real time
- **Live pitch feedback**: real-time visual meter showing in-chord / in-key / out-of-key and pitch stability, updated per phrase (no cent-level numeric display in the free tier)
- **Session recap**: basic post-session summary — percent time in key, stability score, rough problem timestamps
- **Account + song library**: users can save imported instrumentals and revisit past sessions
- **Cross-platform**: desktop (macOS/Windows) + mobile (iOS/Android)

### Pro tier (paywalled)
- **AI-generated pain-point summary**: structured session data → Claude API → a short written coaching note per session ("you tend to go flat on sustained high notes after 1:30")
- **Trend view across sessions**: recurring issues surfaced across multiple attempts at the same song
- **Unlimited saved songs** (free tier caps song count, e.g. 3)

### Explicitly out of scope for MVP
- Vocal separation / "minus" generation inside the app
- Cent-level pitch-accuracy grading against the original vocalist
- A built-in licensed song catalog
- Social features (sharing, leaderboards, duets)
- Offline mode

## 5. Core user flow
1. Onboard → brief explainer that this is key/stability-based coaching, not "prove you sound like the original"
2. Import instrumental (with a lightweight rights checkbox — see legal doc)
3. App analyzes track in background (spinner, ~10-30s depending on length)
4. User picks a section or full song, hits record, sings along with live meter visible
5. Session ends → recap screen (free) or "unlock full coaching summary" upsell (Pro)
6. Song + session history saved to library

## 6. Success criteria for MVP
- A user can go from "open app" to "see live in-key/out-of-key feedback while singing" in under 3 minutes on first use
- Chord/key detection is usably accurate on well-produced pop instrumentals (this is the input quality you should test against first)
- App passes iOS App Store and Google Play review without rejection tied to copyright/content concerns (see legal doc — this is a real review-risk category, not just an external legal risk)
- Pro summary reads like genuinely useful, specific coaching feedback, not generic praise

## 7. Open questions to resolve before build
- Pricing for Pro (subscription vs. per-song credits — needs its own pass, not covered here)
- Minimum viable chord-detection accuracy bar before it's "good enough" to ship
- Whether iOS/Android app review requires extra disclosure language given the audio-import feature (flag for App Store review prep)
