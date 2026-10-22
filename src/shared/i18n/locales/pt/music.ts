import type { PtLocaleShape } from '../../types';
import type { music as en } from '../en/music';

export const music: PtLocaleShape<typeof en> = {
  keyMajor: '{{tonic}} maior',
  keyMinor: '{{tonic}} menor',
  keyDorian: '{{tonic}} dórico',
  keyLydian: '{{tonic}} lídio',
  keyMixolydian: '{{tonic}} mixolídio',
  keyChromatic: '{{tonic}} cromático',
};
