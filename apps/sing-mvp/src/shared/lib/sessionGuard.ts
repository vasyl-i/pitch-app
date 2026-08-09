/**
 * Generation guard for async session lifecycles.
 *
 * Any practice session is a chain of async continuations — a tone finishes, a
 * timer fires, a recorder starts — and every one of them can land *after* the
 * user has ended the session, moved tabs, or started a different round. Each
 * of those late callbacks would otherwise write into a session that no longer
 * exists.
 *
 * The pattern is: bump the generation whenever the session ends or restarts,
 * and tag every continuation with the generation it was scheduled in. Stale
 * continuations become no-ops.
 */
export interface SessionGuard {
  /** the current generation; capture this when scheduling work */
  readonly generation: number;
  /** invalidate every outstanding continuation and clear pending timers */
  invalidate(): void;
  /** is this captured generation still the live one? */
  isCurrent(generation: number): boolean;
  /** run `fn` after `ms`, unless the session moved on first */
  later(generation: number, fn: () => void, ms: number): void;
  /** run `fn` now, unless the session moved on while we awaited something */
  run(generation: number, fn: () => void): void;
}

export function createSessionGuard(): SessionGuard {
  let generation = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];

  return {
    get generation() {
      return generation;
    },

    invalidate() {
      generation++;
      timers.forEach(clearTimeout);
      timers = [];
    },

    isCurrent(gen) {
      return gen === generation;
    },

    later(gen, fn, ms) {
      const id = setTimeout(() => {
        if (gen === generation) fn();
      }, ms);
      timers.push(id);
    },

    run(gen, fn) {
      if (gen === generation) fn();
    },
  };
}
