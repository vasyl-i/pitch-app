export const notifications = {
  reminders: [
    { title: 'No time for a full practice?', body: 'Five minutes is enough to show up for your voice today.' },
    { title: 'Can you hear the difference? 👂', body: "Come back for today's pitch workout and see how you're doing." },
    { title: 'One note closer 🎵', body: 'Build your pitch accuracy one small practice at a time.' },
    { title: 'Your vocal gym is calling 🎤', body: 'Ready for a quick workout? Your next note is waiting.' },
    { title: 'Your voice grows with practice. 🎶', body: 'A tiny workout. A meaningful step.' },
    { title: "Let's make those notes yours.", body: 'Five minutes. One small win.' },
    { title: 'Your next breakthrough starts with one note.', body: 'Keep your ears curious. 👂' },
    { title: 'Ready to find your pitch?', body: 'Your voice deserves five minutes today.' },
  ],
  catchUp: [
    { title: 'A little music before the day ends 🌙', body: 'Take five minutes for yourself and your voice.' },
    { title: 'Every comeback counts 🩵', body: "Missed a day? No worries. Let's pick up where you left off." },
  ],
  screen: {
    title: 'You’re all caught up',
    body: 'Nothing new right now. Practice reminders and updates will show up here.',
  },
  channel: {
    name: 'Practice reminders',
    description: 'Daily practice reminders and trial updates',
  },
  trialEnding: {
    title: 'Your free trial ends tomorrow',
    body: 'Just a heads-up — your subscription will start tomorrow. You can manage it anytime in settings.',
  },
} as const;
