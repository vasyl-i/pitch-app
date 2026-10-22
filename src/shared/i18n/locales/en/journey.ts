export const journey = {
  title: 'Your journey',
  subtitle: 'Every ability you’re building, one milestone at a time.',
  milestonesCount_one: '{{done}} of {{count}} milestone',
  milestonesCount_other: '{{done}} of {{count}} milestones',
  whereYouAre: 'Where you are',
  strongest: 'Strongest: {{skill}} — {{band}}',
  growing: 'Growing: {{skill}} — {{band}}',
  autoProgress: 'Your daily practice on Home moves this forward automatically.',
  milestones: 'Milestones',
  current: 'Where you are now',
  upcoming: 'Coming up',
  locked: 'Locked for now',
  replay: 'Replay',
} as const;

export const weakSpots = {
  subtitle: 'Built from your last two months of practice. These are the specific things your voice keeps slipping on.',
  emptyTitle: 'Not enough data yet',
  emptyBody: 'Your coach needs a few more sessions before it can name a weak spot honestly. Keep practising — this fills in on its own.',
  drill: 'Drill: {{title}}',
} as const;
