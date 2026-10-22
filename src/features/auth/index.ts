export { useAuthStore } from './model/authStore';
export { AuthGate } from './ui/AuthGate';
export { startSync, stopSync, pullFromServer, waitForSyncReady } from './model/syncService';export { reportSignInError, trackSignInAttempt, trackSignInSuccess } from './lib/authErrors';
