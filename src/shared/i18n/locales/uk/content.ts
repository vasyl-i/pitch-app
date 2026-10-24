import type { ContentOverlay } from '../../types';

/**
 * Ukrainian for domain content whose English lives inline in the data files
 * (see `localizeContent`). Keyed `<group>.<id>.<field>`; a missing entry
 * falls back to the English source, and `__tests__/content.test.ts` checks
 * every id is covered.
 */
export const ukContent: ContentOverlay = {
  // entities/exercise/library.ts (also the melody entries of the learning catalog);
  // songs keep their original title, so they only carry `source`
  exercise: {
    'c-major-scale': { title: 'Гама до мажор', source: 'Розспівка · сольфеджіо' },
    'major-arpeggio': { title: 'Мажорне арпеджіо', source: 'Розспівка · тризвук' },
    'e-minor-scale': { title: 'Гама мі мінор', source: 'Розспівка · натуральний мінор' },
    'minor-arpeggio': { title: 'Мінорне арпеджіо', source: 'Розспівка · тризвук' },
    twinkle: { source: 'Народна · суспільне надбання' },
    'mary-lamb': { source: 'Народна · суспільне надбання' },
    'frere-jacques': { source: 'Народна · суспільне надбання' },
    'ode-to-joy': { source: 'Бетховен · суспільне надбання' },
    'd-dorian-mode': {
      title: 'Ре дорійський',
      source: 'Лад · мінор з підвищеним 6-м ступенем',
      hint: 'Дорійський — це мінор зі світлим 6-м ступенем. Прислухайтеся до підйому на B.',
    },
    'c-lydian-mode': {
      title: 'До лідійський',
      source: 'Лад · мажор з підвищеним 4-м ступенем',
      hint: 'Увесь характер — у підвищеному 4-му ступені (F#). Не сповзайте до F.',
    },
    'g-mixolydian-mode': {
      title: 'Соль міксолідійський',
      source: 'Лад · мажор зі зниженим 7-м ступенем',
      hint: '7-й ступінь лишається натуральним — він має звучати незавершено, а не тягнутися вгору.',
    },
    'major-seventh-arpeggio': {
      title: 'Арпеджіо великого мажорного септакорду',
      source: 'Джаз · Cmaj7',
      hint: 'Септима (B) на пів тону нижче октави — цільтеся трохи нижче за До.',
    },
    'minor-seventh-arpeggio': { title: 'Арпеджіо малого мінорного септакорду', source: 'Джаз · Am7' },
    'major-ninth-arpeggio': {
      title: 'Арпеджіо мажорного нонакорду',
      source: 'Джаз · розширений акорд · Cmaj9',
      hint: 'Пʼять нот угору, перш ніж розвернутися, — збережіть запас дихання для D.',
    },
    'chromatic-climb': {
      title: 'Хроматичний підйом',
      source: 'Хроматика · півтони',
      hint: 'Півтони найлегше заспівати зашироко. Думайте про малий крок.',
    },
    'chromatic-neighbours': {
      title: 'Хроматичні сусідні ноти',
      source: 'Хроматика · верхні й нижні',
      hint: 'Відійдіть від ноти й одразу поверніться — повернення має бути точним.',
    },
    'agility-triplets': {
      title: 'Тріолі на рухливість',
      source: 'Рухливість · висхідна секвенція',
      hint: 'Швидкість приходить від розслаблення, а не від зусилля. Тримайте щелепу нерухомою.',
    },
    'melisma-descent': {
      title: 'Низхідна мелізма',
      source: 'Мелізма · один склад, багато нот',
      hint: 'Усе це — одне «А». Не перепроголошуйте — нехай рухається лише висота.',
    },
    'riff-turnaround': { title: 'Пентатонічний риф', source: 'Риф · R&B-зворот' },
    'belt-power-fifths': {
      title: 'Потужні квінти',
      source: 'Белтинг · протяжний верхній регістр',
      hint: 'Опора від ребер, а не від горла. Зупиніться, якщо десь відчуваєте затиск.',
    },
    'mix-voice-ladder': {
      title: 'Вправа на мікст',
      source: 'Мікст · через перехідні ноти',
      hint: 'Проходьте перехід без перемикання — однаковий тембр вище й нижче.',
    },
    'harmony-thirds': {
      title: 'Терції зверху',
      source: 'Гармонія · співайте верхній голос',
      hint: 'Ви співаєте другий голос; акомпанемент тримає мелодію знизу.',
    },
  },

  // entities/exercise/categories.ts
  exerciseCategory: {
    warmup: { label: 'Гами, арпеджіо й розспівки', tagline: 'Мажорні й мінорні гами, тризвуки та мʼякі розспівки.' },
    melody: { label: 'Мелодії', tagline: 'Цілі мелодії, щоб тренувати інтонацію й ритм разом.' },
    modes: { label: 'Лади', tagline: 'Дорійський, лідійський і міксолідійський — барви поза мажором і мінором.' },
    jazz: { label: 'Джаз і розширені акорди', tagline: 'Септими, нони й арпеджіо, на яких тримаються джазові лінії.' },
    chromatic: { label: 'Хроматичні вправи', tagline: 'Точність у півтонах — найскладніших для чистого інтонування інтервалах.' },
    agility: { label: 'Рухливість, пасажі й мелізми', tagline: 'Швидкі пасажі, рифи й рулади для гнучкого голосу.' },
    belt: { label: 'Белтинг і мікст', tagline: 'Сила у верхньому регістрі й плавний перехід через «злам».' },
    harmony: { label: 'Гармонія', tagline: 'Тримайте свою лінію, поки інший голос рухається поруч.' },
  },

  // features/ear-training/model/definitions.ts + the ear drills of the learning catalog
  earExercise: {
    'note-echo': { title: 'Повторіть ноту', tagline: 'Послухайте ноту й заспівайте її у своїй октаві.' },
    'chord-tones': { title: 'Звуки акорду', tagline: 'Послухайте акорд і заспівайте кожну його ноту.' },
    'melody-echo': { title: 'Повторіть мелодію', tagline: 'Послухайте коротку фразу й одразу заспівайте її.' },
    'pitch-memory': { title: 'Памʼять на висоту', tagline: 'Послухайте ноту, утримайте її в памʼяті й заспівайте після таймера.' },
    'echo-interval': { title: 'Повторіть інтервал', tagline: 'Послухайте дві ноти, а потім заспівайте такий самий інтервал.' },
    'sing-interval': { title: 'Заспівайте інтервал', tagline: 'Послухайте інтервал, а потім заспівайте цільову ноту з памʼяті.' },
    'finish-melody': { title: 'Завершіть мелодію', tagline: 'Фраза обривається на ноту раніше — заспівайте ту, що її завершує.' },
    'major-minor': { title: 'Мажор чи мінор?', tagline: 'Послухайте акорд і визначте його лад. Лише слухання — без співу.' },
    'odd-one-out': { title: 'Знайдіть зайве', tagline: 'Три звучання — два однакові, одне інше. Яке саме?' },
  },

  // features/subscription/model/plans.ts
  plan: {
    weekly: { name: 'Щотижня' },
    monthly: { name: 'Щомісяця' },
    yearly: { name: 'Щороку' },
  },

  // features/subscription/model/benefits.ts (keyed by PremiumFeature)
  premiumBenefit: {
    'ai-session-feedback': {
      title: 'Персональний зворотний звʼязок',
      detail: 'Після кожного заняття: що вдалося, що ні і чому — жодних загальних похвал.',
    },
    'adaptive-lessons': {
      title: 'Щоденні адаптивні уроки',
      detail: 'Урок, що щоранку складається з вашого профілю навичок і змінюється разом із вами.',
    },
    'smart-recommendations': {
      title: 'Персональні плани практики',
      detail: 'Вправи, обрані з вашої історії, — кожна з поясненням, чому її обрано.',
    },
    'weak-spot-training': {
      title: 'Тренування слабких місць',
      detail: 'Вправи саме з тих інтервалів, нот і переходів, де ви помиляєтеся.',
    },
    'attempt-comparison': {
      title: 'Порівняння виконань',
      detail: 'Порівнюйте спів із підказкою і самостійно — точність, стабільність і ритм.',
    },
    'advanced-library': {
      title: 'Складніші вправи',
      detail: 'Лади, джазові арпеджіо, хроматика, пасажі, белтинг і мікст.',
    },
    'unlimited-instrumental-uploads': {
      title: 'Необмежені мінусовки',
      detail: 'Завантажуйте скільки завгодно мінусовок — безкоштовно доступні перші 3.',
    },
  },

  // features/learning/lib/skillTree.ts
  skillTree: {
    'pitch-1': { title: 'Повторіть ноту' },
    'pitch-2': { title: 'Гама чисто' },
    'pitch-3': { title: 'Коротка памʼять на висоту' },
    'pitch-4': { title: 'Довга памʼять на висоту' },
    'intervals-1': { title: 'Знайдіть інтервал' },
    'intervals-1b': { title: 'Повторіть інтервал' },
    'intervals-2': { title: 'Прості інтервали' },
    'intervals-3': { title: 'Ширші інтервали' },
    'intervals-4': { title: 'Усі інтервали в обидва боки' },
    'chords-1': { title: 'Мажор чи мінор?' },
    'chords-2': { title: 'Знайдіть акорд' },
    'chords-3': { title: 'Співайте звуки акорду' },
    'chords-4': { title: 'Складні акорди' },
    'melody-1': { title: 'Повторіть дві ноти' },
    'melody-2': { title: 'Повторіть короткі фрази' },
    'melody-3': { title: 'Заспівайте цілу пісню' },
    'melody-4': { title: 'Повторіть довгі фрази' },
    'rhythm-1': { title: 'Рівна проста пісня' },
    'rhythm-2': { title: 'Довші фрази в темпі' },
    'rhythm-3': { title: 'Різні тривалості' },
    'tonality-1': { title: 'Знайдіть гаму' },
    'tonality-2': { title: 'Завершіть мелодію' },
    'tonality-3': { title: 'Мінорні барви' },
    'voice-1': { title: 'Мажорне арпеджіо' },
    'voice-2': { title: 'Рівна мінорна гама' },
    'voice-3': { title: 'Мінорне арпеджіо' },
    'memory-1': { title: 'Утримайте одну ноту' },
    'memory-2': { title: 'Утримайте фразу' },
    'memory-3': { title: 'Хвилина памʼяті' },
    'memory-4': { title: 'Довгі фрази напамʼять' },
    'sight-1': { title: 'Гама з нотного стану' },
    'sight-2': { title: 'Перша пісня з нот' },
    'sight-3': { title: 'Прочитайте класику' },
    'sight-4': { title: 'Довше читання' },
    'perform-1': { title: 'Відшліфуйте твір' },
    'perform-2': { title: 'Майстер інтервалів' },
    'perform-3': { title: 'Майстер акордів' },
  },
};
