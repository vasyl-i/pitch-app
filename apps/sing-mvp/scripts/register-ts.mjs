/**
 * Test-runner shim: lets `node --test` resolve the repo's extensionless
 * relative imports against .ts files (Node's native type stripping handles
 * the rest). Usage: node --import ./scripts/register-ts.mjs --test <files>
 */
import { register } from 'node:module';

register(new URL('./ts-resolver.mjs', import.meta.url));
