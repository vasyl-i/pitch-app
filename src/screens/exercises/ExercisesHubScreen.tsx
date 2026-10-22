/**
 * The Exercises tab: every exercise in one place — ear-training drills and
 * melody/scale practice, grouped by category. Premium exercises are shown
 * locked so free users see what's available.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriesInOrder, exercises, type Exercise } from '@/entities/exercise';
import { EXERCISES } from '@/features/ear-training';
import {
  CATALOG,
  WEEKDAY_LABELS,
  usePreferencesStore,
  DEFAULT_PREFERENCES,
  type WeekdayIndex,
  type WeeklyExerciseEntry,
  type WeeklyPlan,
} from '@/features/learning';
import { bestScores, starsForScore, useProgressStore } from '@/features/progress';
import {
    isPremiumSpeed,
    MAX_FREE_SPEED,
    SPEED_LEVELS,
    speedBpm,
    useSpeedStore,
    type ScaleDirection,
} from '@/features/staff-practice';
import { PremiumBadge, useEntitlement, usePremiumStatus, usePaywall } from '@/features/subscription';
import { AppText, Screen } from '@/shared/ui';
import { typography, useTheme } from '@/shared/theme';
import { formatKeyName, t, useTranslation } from '@/shared/i18n';
import { useFloatingTabBarClearance } from '@/app/navigation/FloatingTabBar';
import type { ExercisesScreenProps } from '@/app/navigation/types';
import { DEFAULT_CAT_ICON, EXERCISE_CAT_ICONS } from '../home/ui/exerciseIcons';

const ICON_SIZE = 64;
const ICON_RADIUS = 14;

const ICON_COLORS = [
  '#E84855', '#F67828', '#F5B700', '#44AF69',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
] as const;

export function ExercisesHubScreen({ navigation }: ExercisesScreenProps<'ExercisesHub'>) {
    const { t } = useTranslation();
    const { palette, spacing } = useTheme();
    const tabBarClearance = useFloatingTabBarClearance(spacing.xl);
    const [levels, setLevels] = useState<Record<string, string>>({});

    const sessions = useProgressStore((s) => s.sessions);
    const best = useMemo(() => bestScores(sessions), [sessions]);
    const { isPremium } = usePremiumStatus();
    const advancedUnlocked = useEntitlement('advanced-library');
    const openPaywall = usePaywall('practice-library', 'advanced-library');

    // Build sets of premium exercise IDs from the catalog
    const premiumEarIds = useMemo(
        () => new Set(CATALOG.filter((a) => a.kind === 'ear' && a.tier === 'premium').map((a) => a.id)),
        [],
    );
    const premiumMelodyIds = useMemo(
        () => new Set(CATALOG.filter((a) => a.kind === 'melody' && a.tier === 'premium').map((a) => a.id)),
        [],
    );

    // Day picker modal state
    const [dayPickerEntry, setDayPickerEntry] = useState<WeeklyExerciseEntry | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const prefs = usePreferencesStore((s) => s.preferences) ?? { ...DEFAULT_PREFERENCES, updatedAt: 0 };
    const setPreferences = usePreferencesStore((s) => s.setPreferences);

    const addToDay = (day: WeekdayIndex) => {
        if (!dayPickerEntry) return;
        const plan: WeeklyPlan = { ...prefs.weeklyPlan };
        plan[day] = [...(plan[day] ?? []), dayPickerEntry];
        setPreferences({ weeklyPlan: plan });
        setDayPickerEntry(null);
        setToast(t('exercises.addedTo', { day: WEEKDAY_LABELS[day] }));
    };

    const byCategory = useMemo(() => {
        const map = new Map<string, Exercise[]>();
        for (const e of exercises) {
            const list = map.get(e.category) ?? [];
            list.push(e);
            map.set(e.category, list);
        }
        return map;
    }, []);

    let colorIndex = 0;

    return (
        <Screen noHorizontalPadding noBottomPadding>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                    <AppText color={palette.textPrimary}
                             style={[styles.heading, { fontFamily: typography.family.bold }]}>
                        {t('nav.exercises')}
                    </AppText>
                    <AppText variant="body" style={{ marginTop: spacing.xs }}>
                        {t('exercises.subtitle')}
                    </AppText>
                </View>

                {/* Ear-training drills */}
                <SectionHeader label={t('profile.picker.earDrills')} tagline="" locked={false} />
                <View>
                    {EXERCISES.map((exercise) => {
                        const selected = levels[exercise.id] ?? exercise.defaultDifficulty ?? undefined;
                        const catIcon = EXERCISE_CAT_ICONS[exercise.id] ?? DEFAULT_CAT_ICON;
                        const inset = catIcon.inset ?? 0;
                        const imgSize = ICON_SIZE - inset * 2;
                        const bgColor = ICON_COLORS[colorIndex++ % ICON_COLORS.length];
                        const locked = premiumEarIds.has(exercise.id) && !isPremium;

                        if (locked) {
                            return (
                                <Pressable key={exercise.id} accessibilityRole="button" onPress={openPaywall}>
                                    {({ pressed }) => (
                                        <View style={[styles.card, pressed && { opacity: 0.7 }]}>
                                            <View style={[styles.row, { opacity: 0.55 }]}>
                                                <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                                                    <Image source={catIcon.source}
                                                           style={{ width: imgSize, height: imgSize }}
                                                           resizeMode="contain"/>
                                                </View>
                                                <View style={styles.info}>
                                                    <AppText variant="label" style={{ fontSize: 16 }}>
                                                        {exercise.title}
                                                    </AppText>
                                                    <AppText variant="caption" style={{ marginTop: 3 }}>
                                                        {exercise.tagline}
                                                    </AppText>
                                                </View>
                                                <Ionicons name="lock-closed" size={16} color={palette.textFaint} />
                                            </View>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        }

                        return (
                            <Pressable
                                key={exercise.id}
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('EarSession', {
                                    exerciseId: exercise.id,
                                    difficultyId: selected
                                })}
                            >
                                {({ pressed }) => (
                                    <View style={[styles.card, pressed && { opacity: 0.7 }]}>
                                        <View style={styles.row}>
                                            <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                                                <Image source={catIcon.source}
                                                       style={{ width: imgSize, height: imgSize }}
                                                       resizeMode="contain"/>
                                            </View>
                                            <View style={styles.info}>
                                                <AppText variant="label" style={{ fontSize: 16 }}>
                                                    {exercise.title}
                                                </AppText>
                                                <AppText variant="caption" style={{ marginTop: 3 }}>
                                                    {exercise.tagline}
                                                </AppText>
                                            </View>
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel={t('exercises.addToPlan')}
                                                hitSlop={10}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setDayPickerEntry({
                                                        activityId: exercise.id,
                                                        kind: 'ear',
                                                        difficultyId: selected,
                                                    });
                                                }}
                                                style={styles.addBtn}
                                            >
                                                <Ionicons name="add-circle" size={26} color={palette.accent} />
                                            </Pressable>
                                        </View>
                                        {exercise.difficulties && (
                                            <View style={styles.chips}>
                                                {exercise.difficulties.map((level) => {
                                                    const isSelected = level.id === selected;
                                                    return (
                                                        <Pressable
                                                            key={level.id}
                                                            accessibilityRole="button"
                                                            accessibilityState={{ selected: isSelected }}
                                                            onPress={() => setLevels((prev) => ({
                                                                ...prev,
                                                                [exercise.id]: level.id
                                                            }))}
                                                            style={[
                                                                styles.chip,
                                                                { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                                                            ]}
                                                        >
                                                            <AppText variant="caption"
                                                                     color={isSelected ? palette.accent : palette.textSecondary}>
                                                                {level.label}
                                                            </AppText>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Melody / scale exercises by category */}
                {categoriesInOrder().map((meta) => {
                    const items = byCategory.get(meta.id) ?? [];
                    if (items.length === 0) return null;
                    const categoryLocked = meta.tier === 'premium' && !advancedUnlocked;
                    const allItemsLocked = categoryLocked && items.every((e) => premiumMelodyIds.has(e.id));
                    return (
                        <View key={meta.id}>
                            <SectionHeader label={meta.label} tagline={meta.tagline} locked={allItemsLocked} />
                            {items.map((e) => {
                                const bgColor = ICON_COLORS[colorIndex++ % ICON_COLORS.length];
                                const exerciseLocked = !isPremium && premiumMelodyIds.has(e.id);
                                return exerciseLocked ? (
                                    <LockedMelodyRow key={e.id} exercise={e} bgColor={bgColor} onPress={openPaywall} />
                                ) : (
                                    <MelodyRow key={e.id} exercise={e} bgColor={bgColor} best={best[e.id]} premium={isPremium} onLockedSpeed={openPaywall} onPress={() => navigation.navigate('MelodyPractice', { exerciseId: e.id })} onAdd={() => setDayPickerEntry({ activityId: e.id, kind: 'melody' })} />
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Day picker modal */}
            <DayPickerModal
                visible={dayPickerEntry !== null}
                weeklyPlan={prefs.weeklyPlan ?? {}}
                entry={dayPickerEntry}
                onSelect={addToDay}
                onClose={() => setDayPickerEntry(null)}
            />

            {/* Toast notification */}
            {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        </Screen>
    );
}

function SectionHeader({ label, tagline, locked }: { label: string; tagline: string; locked: boolean }) {
    const { palette, spacing } = useTheme();
    return (
        <View style={[styles.sectionHeaderBlock, { paddingHorizontal: spacing.lg }]}>
            <View style={styles.sectionTitleRow}>
                <AppText variant="label" style={[styles.sectionLabel, { color: palette.textPrimary }]}>
                    {label}
                </AppText>
                {locked && <PremiumBadge locked />}
            </View>
            {tagline.length > 0 && (
                <AppText variant="body" style={{ fontSize: 13, marginBottom: 4 }}>
                    {tagline}
                </AppText>
            )}
        </View>
    );
}

function MelodyRow({ exercise, bgColor, best, premium, onPress, onAdd, onLockedSpeed }: { exercise: Exercise; bgColor: string; best: number | undefined; premium: boolean; onPress: () => void; onAdd: () => void; onLockedSpeed: () => void }) {
    const { t } = useTranslation();
    const { palette } = useTheme();
    // the tempo it runs at, preview and singing alike — remembered per exercise
    const picked = useSpeedStore((s) => s.speeds[exercise.id] ?? 1);
    // a Premium speed kept from a lapsed subscription plays at the free maximum
    const speed = !premium && isPremiumSpeed(picked) ? MAX_FREE_SPEED : picked;
    const setSpeed = useSpeedStore((s) => s.setSpeed);
    // a scale practised here sweeps through the keys endlessly, from this end first
    const direction = useSpeedStore((s) => s.directions[exercise.id] ?? 'up');
    const setDirection = useSpeedStore((s) => s.setDirection);
    const earned = best === undefined ? 0 : starsForScore(best);
    const catIcon = EXERCISE_CAT_ICONS[exercise.id] ?? DEFAULT_CAT_ICON;
    const inset = catIcon.inset ?? 0;
    const imgSize = ICON_SIZE - inset * 2;

    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            {({ pressed }) => (
                <View style={[styles.card, pressed && { opacity: 0.7 }]}>
                    <View style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                            <Image source={catIcon.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
                        </View>
                        <View style={styles.info}>
                            <AppText variant="label" style={{ fontSize: 16 }}>
                                {exercise.title}
                            </AppText>
                            <AppText variant="caption" style={{ marginTop: 3 }}>
                                {exercise.source} · {formatKeyName(exercise.key)}
                            </AppText>
                            {best !== undefined && (
                                <View style={styles.starRow}>
                                    {[0, 1, 2].map((i) => (
                                        <Ionicons key={i} name={i < earned ? 'star' : 'star-outline'} size={11} color={i < earned ? palette.accent : palette.textFaint} />
                                    ))}
                                    <AppText variant="caption" style={{ fontSize: 12, marginLeft: 4 }}>
                                        {t('exercises.best', { score: best })}
                                    </AppText>
                                </View>
                            )}
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('exercises.addToPlan')}
                            hitSlop={10}
                            onPress={(e) => { e.stopPropagation(); onAdd(); }}
                            style={styles.addBtn}
                        >
                            <Ionicons name="add-circle" size={26} color={palette.accent} />
                        </Pressable>
                    </View>
                    <View style={styles.chips}>
                        {SPEED_LEVELS.map((level) => {
                            const isSelected = level === speed;
                            const locked = !premium && isPremiumSpeed(level);
                            return (
                                <Pressable
                                    key={level}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${t('exercises.speedA11y', { bpm: speedBpm(exercise.bpm, level) })}${locked ? ', Premium' : ''}`}
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => (locked ? onLockedSpeed() : setSpeed(exercise.id, level))}
                                    style={[
                                        styles.chip,
                                        locked && styles.lockedChip,
                                        { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                                    ]}
                                >
                                    {locked && <Ionicons name="lock-closed" size={10} color={palette.textFaint} />}
                                    <AppText variant="caption" color={isSelected ? palette.accent : locked ? palette.textFaint : palette.textSecondary}>
                                        {t('exercises.bpm', { bpm: speedBpm(exercise.bpm, level) })}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>
                    {exercise.pattern === 'scale' && (
                        <View style={[styles.chips, { marginTop: 6 }]}>
                            {scaleDirections().map(({ id, label, icon }) => {
                                const isSelected = id === direction;
                                return (
                                    <Pressable
                                        key={id}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('exercises.keysA11y', { direction: label.toLowerCase() })}
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => setDirection(exercise.id, id)}
                                        style={[
                                            styles.chip,
                                            styles.lockedChip,
                                            { backgroundColor: isSelected ? 'rgba(200, 218, 89, 0.14)' : palette.surface },
                                        ]}
                                    >
                                        <Ionicons name={icon} size={11} color={isSelected ? palette.accent : palette.textSecondary} />
                                        <AppText variant="caption" color={isSelected ? palette.accent : palette.textSecondary}>
                                            {label}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}
        </Pressable>
    );
}

const scaleDirections = (): readonly { id: ScaleDirection; label: string; icon: 'arrow-up' | 'arrow-down' }[] => [
    { id: 'up', label: t('exercises.lowToHigh'), icon: 'arrow-up' },
    { id: 'down', label: t('exercises.highToLow'), icon: 'arrow-down' },
];

function LockedMelodyRow({ exercise, bgColor, onPress }: { exercise: Exercise; bgColor: string; onPress: () => void }) {
    const { palette } = useTheme();
    const catIcon = EXERCISE_CAT_ICONS[exercise.id] ?? DEFAULT_CAT_ICON;
    const inset = catIcon.inset ?? 0;
    const imgSize = ICON_SIZE - inset * 2;

    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            {({ pressed }) => (
                <View style={[styles.card, pressed && { opacity: 0.7 }]}>
                    <View style={[styles.row, { opacity: 0.55 }]}>
                        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                            <Image source={catIcon.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
                        </View>
                        <View style={styles.info}>
                            <AppText variant="label" style={{ fontSize: 16 }}>
                                {exercise.title}
                            </AppText>
                            <AppText variant="caption" style={{ marginTop: 3 }}>
                                {exercise.source} · {formatKeyName(exercise.key)}
                            </AppText>
                        </View>
                        <Ionicons name="lock-closed" size={16} color={palette.textFaint} />
                    </View>
                </View>
            )}
        </Pressable>
    );
}

function DayPickerModal({
    visible,
    weeklyPlan,
    entry,
    onSelect,
    onClose,
}: {
    visible: boolean;
    weeklyPlan: WeeklyPlan;
    entry: WeeklyExerciseEntry | null;
    onSelect: (day: WeekdayIndex) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { palette, spacing, radii } = useTheme();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.modalSheet, { backgroundColor: palette.surfaceSolid, borderRadius: radii.lg }]} onPress={(e) => e.stopPropagation()}>
                    <AppText variant="label" color={palette.textPrimary} style={{ fontSize: 17, marginBottom: spacing.md }}>
                        {t('exercises.addToDay')}
                    </AppText>
                    {WEEKDAY_LABELS.map((label, i) => {
                        const day = i as WeekdayIndex;
                        const dayEntries = weeklyPlan[day] ?? [];
                        const totalCount = dayEntries.length;
                        const dupeCount = entry
                            ? dayEntries.filter((e) => e.activityId === entry.activityId).length
                            : 0;
                        return (
                            <Pressable
                                key={day}
                                accessibilityRole="button"
                                onPress={() => onSelect(day)}
                                style={({ pressed }) => [styles.dayOption, pressed && { opacity: 0.6 }]}
                            >
                                <View>
                                    <AppText variant="body" color={palette.textPrimary} style={{ fontSize: 16 }}>
                                        {label}
                                    </AppText>
                                    {dupeCount > 0 && (
                                        <AppText variant="caption" style={{ marginTop: 2, fontSize: 12 }} color={palette.accent}>
                                            {t('exercises.alreadySet', { count: dupeCount, day: label })}
                                        </AppText>
                                    )}
                                </View>
                                <AppText variant="caption">
                                    {totalCount > 0 ? t('profile.weekly.exerciseCount', { count: totalCount }) : t('exercises.empty')}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
    const { palette, radii } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(1500),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDone());
    }, []);

    return (
        <Animated.View style={[styles.toast, { backgroundColor: palette.surfaceSolid, borderRadius: radii.md, opacity }]}>
            <Ionicons name="checkmark-circle" size={18} color={palette.accent} />
            <AppText variant="body" color={palette.textPrimary} style={{ fontSize: 14 }}>
                {message}
            </AppText>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    heading: {
        fontSize: 24,
        lineHeight: 28,
    },
    sectionHeaderBlock: { marginTop: 24 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionLabel: { fontSize: 18, marginBottom: 6 },
    card: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: ICON_RADIUS,
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    info: { flex: 1, marginLeft: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    // a chip with an icon before its label
    lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    starRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
    addBtn: { marginLeft: 8, padding: 4 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSheet: {
        width: '80%',
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    dayOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    toast: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
