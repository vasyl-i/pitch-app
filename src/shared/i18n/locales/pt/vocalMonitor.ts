import type { PtLocaleShape } from '../../types';
import type { vocalMonitor as en } from '../en/vocalMonitor';

export const vocalMonitor: PtLocaleShape<typeof en> = {
  title: 'Monitor vocal',
  subtitle: 'Cante o que quiser e veja a sua afinação ao vivo',
  hint: 'Cante uma nota qualquer',
  accuracy: 'Precisão',
  stability: 'Estabilidade',
  percent: '{{value}}%',
  level: {
    steady: 'Estável',
    wobbly: 'Instável',
    unsteady: 'Muito instável',
  },
  interrupted: 'Pausa breve — a retomar…',
  couldNotStart: 'Não foi possível começar a ouvir',
};
