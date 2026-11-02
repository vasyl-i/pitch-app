import type { LocaleShape } from '../../types';
import type { vocalMonitor as en } from '../en/vocalMonitor';

export const vocalMonitor: LocaleShape<typeof en> = {
  title: 'Вокальний монітор',
  subtitle: 'Співайте що завгодно й бачте свою висоту наживо',
  hint: 'Заспівайте будь-яку ноту',
  accuracy: 'Точність',
  stability: 'Стабільність',
  percent: '{{value}}%',
  level: {
    steady: 'Рівно',
    wobbly: 'Тремтить',
    unsteady: 'Нестабільно',
  },
  interrupted: 'Коротка пауза — відновлюємо…',
  couldNotStart: 'Не вдалося почати слухати',
};
