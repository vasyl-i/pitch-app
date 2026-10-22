import type { PtLocaleShape } from '../../types';
import type { exercise as en } from '../en/exercise';

export const exercise: PtLocaleShape<typeof en> = {
  verdict: {
    perfect: 'Perfeito',
    sharp: 'Ligeiramente agudo',
    flat: 'Ligeiramente grave',
    wrong: 'Nota errada',
    missed: 'Falhada',
  },
  comparison: {
    improved: 'Excelente! Cantou ainda melhor sem a guia.',
    held: 'Muito bem! Está quase pronto para cantar sozinho.',
    dropped: 'Bom trabalho! Pratique mais algumas vezes com o acompanhamento.',
  },
};
