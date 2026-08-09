/**
 * Asks the device where its audio is currently going, and keeps asking when
 * the route changes.
 *
 * The rule itself lives in `outputRoute`; this module is only the native
 * plumbing around it, so the rule stays testable without an audio stack.
 *
 * Everything here fails closed. If the query throws, the platform returns a
 * shape we don't recognise, or the listener can't be attached, the answer is
 * "not private" — the accompaniment stays silent rather than risking a scored
 * pass with the speaker live. See `outputRoute` for why that asymmetry matters.
 */
import { AudioManager } from 'react-native-audio-api';
import { isPrivateOutput } from './outputRoute';

/** Is every current output route inaudible to the built-in mic? */
export async function outputIsPrivate(): Promise<boolean> {
  try {
    const info = await AudioManager.getDevicesInfo();
    return isPrivateOutput((info?.currentOutputs ?? []).map((d) => d.category));
  } catch {
    return false;
  }
}

/**
 * Calls `onChange` with a fresh answer whenever the audio route changes —
 * headphones pulled mid-phrase, a Bluetooth device connecting, the OS moving
 * us to the receiver. Returns an unsubscribe function.
 *
 * The initial value is delivered too, so callers get one code path for "what
 * is it now" and "what did it become".
 */
export function watchOutputRoute(onChange: (isPrivate: boolean) => void): () => void {
  let stopped = false;
  const refresh = () => {
    void outputIsPrivate().then((isPrivate) => {
      if (!stopped) onChange(isPrivate);
    });
  };

  refresh();

  let subscription: { remove(): void } | undefined;
  try {
    subscription = AudioManager.addSystemEventListener('routeChange', refresh);
  } catch {
    // no listener available on this platform: the value we already fetched
    // stands for the session, which is the conservative outcome
  }

  return () => {
    stopped = true;
    subscription?.remove();
  };
}
