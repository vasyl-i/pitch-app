/**
 * Resolve the repo's import styles for `node --test` (see register-ts.mjs):
 * extensionless relative imports, and the `@/*` -> `src/*` alias tsconfig
 * defines.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

/** Native modules with no node build, swapped for test stubs. */
const STUBS = {
  'react-native-audio-api': path.join(HERE, 'stubs', 'react-native-audio-api.ts'),
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return next(pathToFileURL(STUBS[specifier]).href, context);

  const spec = specifier.startsWith('@/')
    ? pathToFileURL(path.join(SRC, specifier.slice(2))).href
    : specifier;

  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\.[a-zA-Z]+$/.test(spec)) {
    for (const suffix of ['.ts', '/index.ts']) {
      try {
        return await next(spec + suffix, context);
      } catch {
        // fall through to the next candidate
      }
    }
  }
  return next(spec, context);
}
