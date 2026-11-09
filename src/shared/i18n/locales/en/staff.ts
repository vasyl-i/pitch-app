export const staff = {
  keyChange: {
    higher: 'A semitone higher',
    lower: 'A semitone lower',
    newKey: 'A new key',
  },
  prompt: {
    nowIn: 'Now in {{key}}',
    listenFirst: '{{change}} — listen first',
    listen: 'Listen to the example',
    follow: 'Follow the notes',
    accompanied: 'Sing with the accompaniment',
    match: 'Match each note as closely as possible',
    matchHeadphones: 'Match each note — headphones give a truer score',
    yourTurn: 'Your turn',
    looping: 'Looping — sing it again',
    solo: 'Sing without the guide',
  },
  header: {
    todaysPractice: "Today's practice",
    forRange: '{{shift}} for your range',
    wholeSong: 'Whole song',
  },
  restart: 'Restart',
  skipPreview: 'Skip preview',
  /** header toggle: a light haptic tap on every beat */
  metronome: 'Metronome',
  noInputTitle: "We didn't hear any singing.",
  noInputBody: "Check your mic, then give it a try — you'll hear the melody first, then sing it on your own.",
  singAgain: 'Sing again',
  singItAgain: 'Sing it again',
  /** results card between rounds of a scale or arpeggio: on to the next key */
  nextRound: 'Next round',
  couldNotStart: 'Could not start',
  transition: {
    title: 'Now it’s your turn!',
    firstNote: 'Here’s your first note — start from it.',
    onYourOwn: 'Sing the melody on your own.',
  },
  summary: {
    title: 'Phrase score',
    metaDeviation: '{{cents}}¢ average off',
    metaRhythm: '{{rhythm}}% rhythm',
    comparisonTitle: 'Assisted vs. independent',
    comparisonWell: 'You held up well on your own this time — see the full accuracy, stability and rhythm breakdown with Premium.',
    comparisonSlipped: 'Premium shows exactly where the guide was carrying you — accuracy, stability and rhythm, side by side.',
    unlockComparison: 'Unlock comparison →',
  },
} as const;

export const pitch = {
  flat: 'flat',
  sharp: 'sharp',
  inTune: 'in tune',
  confidence: 'Confidence',
  hz: '{{value}} Hz',
  hzLower: '{{value}} hz',
} as const;
