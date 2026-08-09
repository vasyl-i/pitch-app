# MVP roadmap — phased build order

Each phase should produce something you can actually test, not just code that compiles. Don't move to the next phase until the current one is genuinely validated — the highest-risk parts of this build are phases 1 and 2, and they're cheap to de-risk early and expensive to discover are broken late.

## Phase 0 — Groundwork (a few days)
- Finalize this doc set with any changes you want
- Set up the shared code workspace structure (`packages/core`, plus app shells)
- Set up Claude Code in your dev environment (see "Working with Claude on this" below)

## Phase 1 — Prove the core loop works at all (highest priority, do this first)
Build a single-page **web prototype** (not mobile, not desktop packaging yet) that:
- Loads one hardcoded instrumental
- Runs chord/key analysis on it (can be done as a one-off script, doesn't need to be a full backend yet)
- Captures mic input in-browser via Web Audio API
- Runs real-time YIN pitch tracking
- Shows a live in-chord/in-key/out-of-key meter

Goal: validate that the actual product idea feels good to use before investing in cross-platform packaging, auth, storage, or any of the rest. If the live feedback loop doesn't feel responsive and useful here, nothing downstream matters yet.

## Phase 2 — Mobile audio feasibility spike
In parallel with or right after phase 1: a minimal React Native/Expo spike that does *only* mic capture + real-time pitch detection, no UI polish. This is where mobile-specific audio latency problems will show up — find out early whether you need a custom native module before you've built the rest of the app around an assumption that doesn't hold.

## Phase 3 — Backend + real upload flow
- Auth
- Instrumental upload + storage
- Chord/key analysis worker as a real background job
- Session stats storage

## Phase 4 — Full client apps
- Port the phase 1 prototype's core logic into the shared package
- Build out the Expo mobile app and Tauri desktop app around it
- Song library, session history, recap screens

## Phase 5 — Pro tier
- Claude API integration for the pain-point summary
- Paywall/subscription flow
- Trend view across sessions

## Phase 6 — Store readiness
- App Store / Play Store listing assets, review notes (see legal doc)
- Desktop code signing + notarization (macOS) and installer packaging (Windows)
- Beta test with a small real user group before public submission

## Working with Claude on this build
- Use **Claude Code** (desktop, VS Code, or terminal) for the actual implementation work — it can read/write your codebase directly, run your build, and iterate on real files, which is a better fit than pasting code back and forth in chat once you're past the prototype stage.
- Drop the custom project skill (`pitch-coach-app` — see accompanying SKILL.md) into your Claude Code project so every session has this architecture, the legal boundaries, and the scoring approach already loaded as context, instead of you re-explaining it each time.
- Use this chat (or Cowork, for heavier multi-file research/analysis tasks) for planning, doc updates, and any research spikes; switch to Claude Code once you're writing real application code.
