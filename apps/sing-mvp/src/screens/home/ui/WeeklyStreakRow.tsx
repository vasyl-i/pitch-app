import { View } from 'react-native';
import { AppText } from '@/shared/ui';
import { localDayKey } from '@/features/progress';
import { todayColor } from '../todayPalette';

const DAY_MS = 24 * 60 * 60 * 1000;
const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week Monday→Sunday as seven dots: filled = practiced, ringed = today. */
export function WeeklyStreakRow({ practicedDays, now = Date.now() }: { practicedDays: Set<string>; now?: number }) {
  const today = new Date(now);
  // getDay(): Sunday 0 — shift so Monday leads the row
  const monday = now - ((today.getDay() + 6) % 7) * DAY_MS;
  const todayKey = localDayKey(now);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {LABELS.map((label, i) => {
        const key = localDayKey(monday + i * DAY_MS);
        const practiced = practicedDays.has(key);
        const isToday = key === todayKey;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: practiced ? todayColor.orange : todayColor.surfaceMuted,
                borderWidth: isToday && !practiced ? 1 : 0,
                borderColor: todayColor.inkFaint,
              }}
            >
              {practiced && <AppText style={{ fontSize: 13, color: todayColor.inkOnAccent }}>✓</AppText>}
            </View>
            <AppText variant="caption" color={isToday ? todayColor.ink : todayColor.inkFaint} style={{ fontSize: 11 }}>
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
