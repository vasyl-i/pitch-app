import type { LocaleShape } from '../../types';
import type { pitch as enPitch, staff as en } from '../en/staff';

export const staff: LocaleShape<typeof en> = {
  keyChange: {
    higher: 'На пів тону вище',
    lower: 'На пів тону нижче',
    newKey: 'Нова тональність',
  },
  prompt: {
    nowIn: 'Тональність: {{key}}',
    listenFirst: '{{change}} — спершу послухайте',
    listen: 'Послухайте приклад',
    follow: 'Стежте за нотами',
    accompanied: 'Співайте з акомпанементом',
    match: 'Влучайте в кожну ноту якомога точніше',
    matchHeadphones: 'Влучайте в кожну ноту — у навушниках оцінка точніша',
    yourTurn: 'Ваша черга',
    looping: 'Повтор — заспівайте ще раз',
    solo: 'Співайте без підказки',
  },
  header: {
    todaysPractice: 'Сьогоднішня практика',
    forRange: '{{shift}} під ваш діапазон',
    wholeSong: 'Уся пісня',
  },
  restart: 'Почати знову',
  skipPreview: 'Пропустити прослуховування',
  metronome: 'Метроном',
  noInputTitle: 'Ми не почули співу.',
  noInputBody: 'Перевірте мікрофон і спробуйте ще раз — спершу ви почуєте мелодію, а потім заспіваєте її самостійно.',
  singAgain: 'Заспівати ще раз',
  singItAgain: 'Заспівати ще раз',
  nextRound: 'Наступний раунд',
  couldNotStart: 'Не вдалося почати',
  transition: {
    title: 'Тепер ваша черга!',
    firstNote: 'Ось ваша перша нота — почніть із неї.',
    onYourOwn: 'Заспівайте мелодію самостійно.',
  },
  summary: {
    title: 'Оцінка фрази',
    metaDeviation: 'середнє відхилення {{cents}}¢',
    metaRhythm: 'ритм {{rhythm}}%',
    comparisonTitle: 'З підказкою чи самостійно',
    comparisonWell: 'Цього разу ви чудово впоралися самостійно — повний розбір точності, стабільності й ритму доступний у Premium.',
    comparisonSlipped: 'Premium показує, де саме вас «тягнула» підказка, — точність, стабільність і ритм поруч.',
    unlockComparison: 'Відкрити порівняння →',
  },
};

export const pitch: LocaleShape<typeof enPitch> = {
  flat: 'нижче',
  sharp: 'вище',
  inTune: 'точно',
  confidence: 'Надійність',
  hz: '{{value}} Гц',
  hzLower: '{{value}} Гц',
};
