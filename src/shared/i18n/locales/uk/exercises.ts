import type { LocaleShape } from '../../types';
import type { exercises as en } from '../en/exercises';

export const exercises: LocaleShape<typeof en> = {
  subtitle: 'Будь-яка вправа — у вашому темпі.',
  addedTo: 'Додано на {{day}}',
  addToPlan: 'Додати до плану на тиждень',
  addToDay: 'Додати на день',
  best: 'найкраще {{score}}',
  speedA11y: 'Темп {{bpm}} ударів на хвилину',
  bpm: '{{bpm}} уд/хв',
  speedCaption: 'Темп, уд/хв',
  keysA11y: 'Тональності {{direction}}',
  lowToHigh: 'Знизу вгору',
  highToLow: 'Згори вниз',
  alreadySet: 'Уже додано на {{day}}: {{count}}',
  empty: 'Порожньо',
};
