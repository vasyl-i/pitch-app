import type { LocaleShape } from '../../types';
import type { exercise as en } from '../en/exercise';

export const exercise: LocaleShape<typeof en> = {
  verdict: {
    perfect: 'Ідеально',
    sharp: 'Трохи вище',
    flat: 'Трохи нижче',
    wrong: 'Не та нота',
    missed: 'Пропущено',
  },
  comparison: {
    improved: 'Чудово! Без підказки ви заспівали ще краще.',
    held: 'Чудова робота! Ви майже готові співати це самостійно.',
    dropped: 'Гарна робота! Потренуйтеся з акомпанементом ще кілька разів.',
  },
};
