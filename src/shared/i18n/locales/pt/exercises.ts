import type { PtLocaleShape } from '../../types';
import type { exercises as en } from '../en/exercises';

export const exercises: PtLocaleShape<typeof en> = {
  subtitle: 'Pratique qualquer exercício ao seu ritmo.',
  addedTo: 'Adicionado a {{day}}',
  addToPlan: 'Adicionar ao plano semanal',
  addToDay: 'Adicionar ao dia',
  best: 'melhor {{score}}',
  speedA11y: 'Velocidade {{bpm}} batidas por minuto',
  bpm: '{{bpm}} bpm',
  speedCaption: 'Velocidade, bpm',
  keysA11y: 'Tonalidades {{direction}}',
  lowToHigh: 'Do grave ao agudo',
  wholeSong: 'Canção inteira',
  wholeSongA11y: 'Cantar a canção inteira',
  highToLow: 'Do agudo ao grave',
  alreadySet: '{{count}} já definidos para {{day}}',
  empty: 'Vazio',
};
