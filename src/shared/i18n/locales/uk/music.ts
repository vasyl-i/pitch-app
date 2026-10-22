import type { LocaleShape } from '../../types';
import type { music as en } from '../en/music';

export const music: LocaleShape<typeof en> = {
  keyMajor: '{{tonic}} мажор',
  keyMinor: '{{tonic}} мінор',
  keyDorian: '{{tonic}} дорійський',
  keyLydian: '{{tonic}} лідійський',
  keyMixolydian: '{{tonic}} міксолідійський',
  keyChromatic: '{{tonic}} хроматика',
};
