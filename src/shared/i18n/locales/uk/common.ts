import type { LocaleShape } from '../../types';
import type { common as en, nav as enNav } from '../en/common';

export const common: LocaleShape<typeof en> = {
  back: 'Назад',
  close: 'Закрити',
  cancel: 'Скасувати',
  continue: 'Продовжити',
  start: 'Почати',
  skip: 'Пропустити',
  save: 'Зберегти',
  tryAgain: 'Спробувати ще раз',
  notNow: 'Не зараз',
  openSettings: 'Відкрити налаштування',
  delete: 'Видалити',
  and: ' і ',
  next: 'Далі',
  done: 'Готово',
  goBack: 'Назад',
  error: 'Помилка',
  tryAgainLater: 'Спробуйте пізніше',
  somethingWentWrong: 'Щось пішло не так',
  dontShowAgain: 'Більше не показувати',
  reminderHour: 'Година нагадування',
  reminderMinute: 'Хвилина нагадування',
  minutesShort_one: '{{count}} хв',
  minutesShort_few: '{{count}} хв',
  minutesShort_many: '{{count}} хв',
  minutesShort_other: '{{count}} хв',
  daysShort_one: '{{count}} д',
  daysShort_few: '{{count}} д',
  daysShort_many: '{{count}} д',
  daysShort_other: '{{count}} д',
  offline: 'Офлайн',
  offlineToastTitle: 'Немає інтернету',
  offlineToastMessage: 'Прогрес зберігається на пристрої й синхронізується, коли з’явиться зʼєднання.',
};

export const nav: LocaleShape<typeof enNav> = {
  home: 'Головна',
  exercises: 'Вправи',
  progress: 'Прогрес',
  account: 'Профіль',
};
