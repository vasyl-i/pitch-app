import type { LocaleShape } from '../../types';
import type { home as en } from '../en/home';

export const home: LocaleShape<typeof en> = {
  heading: 'Час практикуватися 🎧️️',
  monitorBanner: {
    title: 'Вокальний монітор',
    subtitle: 'Дивіться на точність і стабільність',
  },
  trialEndsTomorrow: 'Пробний період завершується завтра',
  practice: 'Практика',
  shine: {
    title: 'Знайди. Влучи. Сяй!',
    body: 'Практикуйтеся потроху щодня — і побачите різницю!',
  },
  redo: {
    title: 'Пройти вправу ще раз?',
    message: 'Попередні результати цієї вправи буде видалено.',
  },
  plan: {
    title: 'План на сьогодні',
    morePractice: 'Більше практики',
    preparing: 'Готуємо сьогоднішнє заняття…',
    complete: 'Практику завершено — чудова робота сьогодні.',
    completeExplore: 'Практику завершено — чудова робота. Повертайтеся завтра або тренуйтеся вільно нижче.',
    continue: 'Продовжити практику',
    start: 'Почати практику',
  },
  status: {
    completed: 'Виконано',
    inProgress: 'Триває',
    ready: 'Наступна',
  },
  stats: {
    accuracy: 'Точність',
    inARow: 'Поспіль',
    practiceTime: 'Час практики',
  },
  progress: {
    title: 'Ваш прогрес',
  },
  exerciseDescription: {
    noteEcho: 'Послухайте ноту й заспівайте її',
    pitchMemory: 'Послухайте ноту й заспівайте її через хвилину',
    singInterval: 'Послухайте інтервал і заспівайте його',
    melodyEcho: 'Послухайте гаму й заспівайте її',
    chordTones: 'Послухайте звуки акорду',
    majorMinor: 'Послухайте й відрізніть мажор від мінору',
    oddOneOut: 'Знайдіть зайвий звук',
    finishMelody: 'Послухайте мелодію й заспівайте останню ноту',
    echoInterval: 'Послухайте інтервал і повторіть його',
  },
};
