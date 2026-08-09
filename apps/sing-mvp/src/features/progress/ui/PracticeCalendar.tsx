import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { localDayKey } from '../lib/stats';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Month grid with practiced days checked off. Weeks start on Monday; days are
 * keyed with `localDayKey` so they match the consistency count exactly.
 */
export function PracticeCalendar({ practicedDays }: { practicedDays: Set<string> }) {
  const { palette, radii } = useTheme();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const now = new Date();
  const todayKey = localDayKey(now.getTime());
  const viewingCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Ionicons name="chevron-back" size={18} color={palette.textFaint} />
        </Pressable>
        <AppText variant="label">
          {MONTHS[cursor.month]} {cursor.year}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => shiftMonth(1)}
          disabled={viewingCurrentMonth}
          hitSlop={8}
          style={({ pressed }) => [viewingCurrentMonth && { opacity: 0.25 }, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((label, i) => (
          <View key={`wd-${i}`} style={styles.cell}>
            <AppText variant="caption" style={{ fontSize: 10 }}>
              {label}
            </AppText>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={styles.cell} />;
          const key = `${cursor.year}-${cursor.month}-${day}`;
          const practiced = practicedDays.has(key);
          const isToday = key === todayKey;
          return (
            <View key={key} style={styles.cell}>
              <View
                style={[
                  styles.day,
                  { borderRadius: radii.pill },
                  practiced && { backgroundColor: palette.accent },
                  isToday && !practiced && { borderWidth: 1, borderColor: palette.accent },
                ]}
              >
                {practiced ? (
                  <Ionicons name="checkmark" size={14} color={palette.onAccent} />
                ) : (
                  <AppText variant="caption" color={isToday ? palette.accent : palette.textSecondary} style={{ fontSize: 12 }}>
                    {day}
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
