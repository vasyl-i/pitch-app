import type { LocaleShape } from '../../types';
import type { journey as en, weakSpots as enWeakSpots } from '../en/journey';

export const journey: LocaleShape<typeof en> = {
  title: 'Ваш шлях',
  subtitle: 'Кожна навичка, яку ви розвиваєте, — крок за кроком.',
  milestonesCount_one: '{{done}} з {{count}} етапу',
  milestonesCount_few: '{{done}} з {{count}} етапів',
  milestonesCount_many: '{{done}} з {{count}} етапів',
  milestonesCount_other: '{{done}} з {{count}} етапів',
  whereYouAre: 'Де ви зараз',
  strongest: 'Найсильніше: {{skill}} — {{band}}',
  growing: 'Розвивається: {{skill}} — {{band}}',
  autoProgress: 'Щоденна практика на Головній просуває вас автоматично.',
  milestones: 'Етапи',
  current: 'Ви тут',
  upcoming: 'Далі',
  locked: 'Поки закрито',
  replay: 'Повторити',
};

export const weakSpots: LocaleShape<typeof enWeakSpots> = {
  subtitle: 'На основі вашої практики за останні два місяці. Саме тут ваш голос найчастіше збивається.',
  emptyTitle: 'Поки замало даних',
  emptyBody: 'Тренеру потрібно ще кілька занять, щоб чесно назвати слабке місце. Продовжуйте практику — усе зʼявиться саме.',
  drill: 'Вправа: {{title}}',
};
