# Sync and offline mode

Local MMKV is the source of truth for the UI; Supabase is a replica. The app must be usable with no connection and must never block its first screen on the network.

## Startup (no network waits)

- **Auth** (`features/auth/model/authStore.ts`): `hydrate` reads the persisted session straight from SecureStore (`readStoredSession`). It does NOT call `supabase.auth.getSession()`: offline, that retries the token refresh for ~30s and then reports "no session". Supabase's auto-refresh renews the token in the background. The `onAuthStateChange` listener ignores a null session unless the event is `SIGNED_OUT`.
- **First screen** (`app/navigation/useRootReady.ts`): `ready = hydrated && (onboarded locally || synced)`. Returning users never wait for the server. A fresh sign-in waits for the pull, bounded by `SYNC_GATE_MAX_MS` (6s) in `syncService.ts`.
- **Late "already onboarded"**: if the pull flips onboarding to complete while the user is in the onboarding flow, `OnboardingHost` (`RootNavigator.tsx`) resets to the tabs. It does nothing when the user finishes onboarding themselves.

## Reconcile rule (`features/auth/model/syncService.ts`, `pullFromServer`)

Per record, compare timestamps: the newer side wins, and if that is the device, push it up. This covers offline edits (never pushed), a second device, and fresh sign-in.

| Data | Local timestamp | Notes |
|---|---|---|
| Vocal profile (+ autoTranspose) | `useProfileStore.updatedAt` (0 = never) | `importProfile` applies the server copy without bumping it |
| Learning preferences | `preferences.updatedAt` | `importPreferences`, same idea |
| Today's daily plan | `useLessonSessionStore.updatedAt` | |
| Sessions | `at` | local sessions the server lacks are bulk-inserted; skipped if older than a full 500-row server page |
| Daily stats / mastery | per-day rows | diffed in `syncDailyStats` |
| Total practice sec | larger value wins | pushes if local is larger |
| Skills, week snapshots | n/a | re-upserted at the end of every pull (skills are never pulled) |

Rules to keep:
- Use `.maybeSingle()` and check `error`: a failed request must never be read as "no row on the server" (that would push local over newer server data).
- Never stamp `updatedAt` with `Date.now()` when applying server data (use the `import*` setters), or it looks like a newer local edit and echoes back.
- Pushes send the LOCAL timestamp as `updated_at`, not the time of the push.
- One pull at a time (`pulling`); skipped while offline.
- Any new synced store needs an `updatedAt`, an `import*` setter, and a branch in `runPull`.

## Connectivity

- `shared/lib/network.ts`: `useNetworkStore` (NetInfo), `useIsOffline()`, `isOffline()`, `onReconnect(fn)`, `startNetworkMonitor()`. Unknown reachability counts as online.
- `SyncManager` runs `pullFromServer()` on reconnect.
- `app/sync/NetworkSync.tsx`: starts the monitor and shows an info toast when the connection drops (or on an offline start). Strings: `common.offlineToast*`.
- `shared/ui/OfflineBadge.tsx`: `OfflineBadge` pill and `TabTitleRow` (title left, badge right). Used in the Home, Exercises, Progress and Account tab headers.
- Requires `@react-native-community/netinfo` (native module; needs a rebuild).

## Known gaps

- The `sessions` insert is not idempotent: a retry after a partial failure could duplicate rows unless the table has a unique key on `(user_id, created_at)`; an upsert would close it.
- Skills are pushed but never pulled, so a new device does not get them back.
- Pushes made while offline are not queued; they are recovered by the next pull's compare-and-push.
