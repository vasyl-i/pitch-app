/**
 * The synthetic signal generators moved to `../../benchmark/signals` when the
 * benchmark harness was added: the same material now feeds both the YIN
 * regression suite and the benchmark, and duplicating it would have let the two
 * drift into measuring different things.
 *
 * This re-export keeps the suite's original import path working. Prefer
 * importing from the benchmark module directly in new code.
 */
export * from '../../benchmark/signals';
