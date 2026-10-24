import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, radii } from '@/shared/theme';
import { formatDate, useTranslation } from '@/shared/i18n';
import { localDayKey } from '../lib/stats';

/** single-letter weekday headers, Monday first, in the app language (2024-01-01 was a Monday) */
const weekdayInitials = () =>
  Array.from({ length: 7 }, (_, i) => formatDate(new Date(2024, 0, 1 + i), { weekday: 'narrow' }));

/** "October 2026" / "Жовтень 2026 р." */
const monthTitle = (year: number, month: number) => {
  const label = formatDate(new Date(year, month, 1), { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** the month's day numbers, padded with nulls to whole Monday-first weeks */
function monthCells(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Month grid with practiced days checked off. Weeks start on Monday; days are
 * keyed with `localDayKey` so they match the consistency count exactly.
 */
export function PracticeCalendar({ practicedDays }: { practicedDays: Set<string> }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const now = new Date();
  const todayKey = localDayKey(now.getTime());
  const viewingCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <View>
      <MonthHeader
        title={monthTitle(cursor.year, cursor.month)}
        onPrevious={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        nextDisabled={viewingCurrentMonth}
      />
      <View style={styles.grid}>
        {weekdayInitials().map((label, i) => (
          <View key={`wd-${i}`} style={styles.cell}>
            <AppText variant="caption">{label}</AppText>
          </View>
        ))}
        {monthCells(cursor.year, cursor.month).map((day, i) => {
          if (day === null) return <View key={`blank-${i}`} style={styles.cell} />;
          const key = `${cursor.year}-${cursor.month}-${day}`;
          return <DayCell key={key} day={day} practiced={practicedDays.has(key)} today={key === todayKey} />;
        })}
      </View>
    </View>
  );
}

function MonthHeader({ title, onPrevious, onNext, nextDisabled }: {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('progress.calendar.previous')}
        onPress={onPrevious}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Ionicons name="chevron-back" size={18} color={palette.textFaint} />
      </Pressable>
      <AppText variant="label">{title}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('progress.calendar.next')}
        onPress={onNext}
        disabled={nextDisabled}
        hitSlop={8}
        style={({ pressed }) => [nextDisabled && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
      </Pressable>
    </View>
  );
}

function DayCell({ day, practiced, today }: { day: number; practiced: boolean; today: boolean }) {
  return (
    <View style={styles.cell}>
      <View style={[styles.day, practiced ? styles.practiced : today && styles.today]}>
        {practiced ? (
          <Ionicons name="checkmark" size={14} color={palette.onAccent} />
        ) : (
          <AppText variant="caption" color={today ? palette.accent : palette.textSecondary}>
            {day}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.25 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  practiced: { backgroundColor: palette.accent },
  today: { borderWidth: 1, borderColor: palette.accent },
});
