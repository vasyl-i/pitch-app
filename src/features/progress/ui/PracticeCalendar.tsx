import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/shared/ui';
import { palette, radii } from '@/shared/theme';
import { formatDate, translatedRecord, useTranslation } from '@/shared/i18n';
import { isoDay } from '../lib/history';

const WEEKDAY_ORDER = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;
type Weekday = (typeof WEEKDAY_ORDER)[number];

/** two-letter weekday headers ("Mo", "Tu" …), Monday first, in the app language */
const WEEKDAYS = translatedRecord<Weekday>({
    mo: 'progress.calendar.weekdays.mo',
    tu: 'progress.calendar.weekdays.tu',
    we: 'progress.calendar.weekdays.we',
    th: 'progress.calendar.weekdays.th',
    fr: 'progress.calendar.weekdays.fr',
    sa: 'progress.calendar.weekdays.sa',
    su: 'progress.calendar.weekdays.su',
});

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
 * `isoDay` keys from the day history, so every month back to the first
 * session is still marked.
 */
export function PracticeCalendar({ practicedDays }: { practicedDays: Set<string> }) {
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return { year: n.getFullYear(), month: n.getMonth() };
    });

    const now = new Date();
    const todayKey = isoDay(now.getTime());
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
                {WEEKDAY_ORDER.map((day) => (
                    <View key={day} style={styles.cell}>
                        <AppText variant="small">{WEEKDAYS[day]}</AppText>
                    </View>
                ))}
                {monthCells(cursor.year, cursor.month).map((day, i, cells) => {
                    if (day === null) return <View key={`blank-${i}`} style={styles.cell}/>;
                    const practicedOn = (d: number | null) =>
                        d !== null && practicedDays.has(isoDay(new Date(cursor.year, cursor.month, d).getTime()));
                    const key = isoDay(new Date(cursor.year, cursor.month, day).getTime());
                    const practiced = practicedDays.has(key);
                    // a run of practiced days joins up within its week row
                    const column = i % 7;
                    return (
                        <DayCell
                            key={key}
                            day={day}
                            practiced={practiced}
                            today={key === todayKey}
                            linkBefore={practiced && column > 0 && practicedOn(cells[i - 1])}
                            linkAfter={practiced && column < 6 && practicedOn(cells[i + 1])}
                        />
                    );
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
                <Ionicons name="chevron-back" size={18} color={palette.white}/>
            </Pressable>
            <View style={styles.headerText}>
                <AppText variant="label">{title}</AppText>
            </View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('progress.calendar.next')}
                onPress={onNext}
                disabled={nextDisabled}
                hitSlop={8}
                style={({ pressed }) => [nextDisabled && styles.disabled, pressed && styles.pressed]}
            >
                <Ionicons name="chevron-forward" size={18} color={nextDisabled ? palette.textFaint : palette.white}/>
            </Pressable>
        </View>
    );
}

/**
 * One day of the grid. A practiced day next to another practiced day in the
 * same week draws a half-width accent bar towards it, behind its circle; the
 * two halves meet at the cell edge, so a streak reads as one connected line.
 */
function DayCell({ day, practiced, today, linkBefore, linkAfter }: {
    day: number;
    practiced: boolean;
    today: boolean;
    linkBefore: boolean;
    linkAfter: boolean;
}) {
    return (
        <View style={styles.cell}>
            {linkBefore && <View style={[styles.link, styles.linkBefore]}/>}
            {linkAfter && <View style={[styles.link, styles.linkAfter]}/>}
            <View style={[styles.day, practiced ? styles.practiced : today && styles.today]}>
                {practiced ? (
                    <Ionicons name="checkmark" size={14} color={palette.onAccent}/>
                ) : (
                    <AppText variant="small" color={today ? palette.accent : palette.textFaint}>
                        {day}
                    </AppText>
                )}
            </View>
        </View>
    );
}

const DAY_SIZE = 28;
const CELL_PADDING = 3;
/** the streak connector between neighbouring practiced days */
const LINK_HEIGHT = 4;

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerText: { textAlign: 'right', alignSelf: "flex-start", flex: 1, paddingHorizontal: 10 },
    pressed: { opacity: 0.6 },
    disabled: { opacity: 0.25 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: CELL_PADDING },
    day: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
    link: {
        position: 'absolute',
        top: CELL_PADDING + (DAY_SIZE - LINK_HEIGHT) / 2,
        height: LINK_HEIGHT,
        backgroundColor: palette.accent,
    },
    linkBefore: { left: 0, right: '50%' },
    linkAfter: { left: '50%', right: 0 },
    practiced: { backgroundColor: palette.accent, alignItems: "center" },
    today: { borderWidth: 1, borderColor: palette.accent },
});
