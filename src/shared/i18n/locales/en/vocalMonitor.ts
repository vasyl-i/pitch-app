export const vocalMonitor = {
  title: 'Vocal monitor',
  subtitle: 'Sing anything and see your pitch live',
  hint: 'Sing any note',
  accuracy: 'Accuracy',
  stability: 'Stability',
  percent: '{{value}}%',
  level: {
    steady: 'Steady',
    wobbly: 'Wobbly',
    unsteady: 'Unsteady',
  },
  interrupted: 'Paused for a moment — resuming…',
  couldNotStart: 'Could not start listening',
} as const;
