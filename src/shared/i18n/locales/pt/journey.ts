import type { PtLocaleShape } from '../../types';
import type { journey as en, weakSpots as enWeakSpots } from '../en/journey';

export const journey: PtLocaleShape<typeof en> = {
  title: 'O seu percurso',
  subtitle: 'Cada capacidade que está a desenvolver, um marco de cada vez.',
  milestonesCount_one: '{{done}} de {{count}} marco',
  milestonesCount_many: '{{done}} de {{count}} marcos',
  milestonesCount_other: '{{done}} de {{count}} marcos',
  whereYouAre: 'Onde está',
  strongest: 'Mais forte: {{skill}} — {{band}}',
  growing: 'A crescer: {{skill}} — {{band}}',
  autoProgress: 'A sua prática diária no Início faz isto avançar automaticamente.',
  milestones: 'Marcos',
  current: 'Onde está agora',
  upcoming: 'A seguir',
  locked: 'Bloqueado por agora',
  replay: 'Repetir',
};

export const weakSpots: PtLocaleShape<typeof enWeakSpots> = {
  subtitle: 'Com base nos seus últimos dois meses de prática. São os pontos concretos em que a sua voz continua a falhar.',
  emptyTitle: 'Ainda não há dados suficientes',
  emptyBody: 'O seu treinador precisa de mais algumas sessões para identificar um ponto fraco com rigor. Continue a praticar — isto preenche-se sozinho.',
  drill: 'Exercício: {{title}}',
};
