import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';

const ROW_HEIGHT = 44;
const MAX_VISIBLE_ROWS = 5;
const LIST_GAP = 6;

type Option = { value: number; label: string };

const HOUR_OPTIONS: Option[] = Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`,
}));

function minuteOptions(step: number): Option[] {
    return Array.from({ length: Math.ceil(60 / step) }, (_, i) => ({
        value: i * step,
        label: (i * step).toString().padStart(2, '0'),
    }));
}

/**
 * Hour + minute selector built from two in-app dropdowns. Used on Android in
 * place of the native time picker dialog, which can't be themed and covers
 * the screen.
 */
export function TimeDropdown({ value, onChange, minuteInterval = 5 }: {
    value: Date;
    onChange: (date: Date) => void;
    minuteInterval?: number;
}) {
    const { palette, spacing, typography } = useTheme();
    const minutes = minuteOptions(minuteInterval);
    const minute = Math.floor(value.getMinutes() / minuteInterval) * minuteInterval;

    const update = (h: number, m: number) => {
        const next = new Date(value);
        next.setHours(h, m, 0, 0);
        onChange(next);
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm }}>
            <Dropdown
                accessibilityLabel="Reminder hour"
                options={HOUR_OPTIONS}
                selected={value.getHours()}
                onSelect={(h) => update(h, minute)}
            />
            <AppText
                variant="label"
                gradient={false}
                color={palette.textSecondary}
                style={{ fontSize: 22, lineHeight: 28, fontFamily: typography.family.bold }}
            >
                :
            </AppText>
            <Dropdown
                accessibilityLabel="Reminder minute"
                options={minutes}
                selected={minute}
                onSelect={(m) => update(value.getHours(), m)}
            />
        </View>
    );
}

type Anchor = { x: number; y: number; width: number; height: number };

function Dropdown({ options, selected, onSelect, accessibilityLabel }: {
    options: Option[];
    selected: number;
    onSelect: (value: number) => void;
    accessibilityLabel: string;
}) {
    const { palette, radii, spacing, typography } = useTheme();
    const { height: windowHeight } = useWindowDimensions();
    const fieldRef = useRef<View>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);

    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === selected));
    const listHeight = Math.min(options.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

    const open = () => {
        fieldRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
    };
    const close = () => setAnchor(null);

    // Open below the field, or above it when there isn't room
    const listTop = anchor
        ? anchor.y + anchor.height + LIST_GAP + listHeight > windowHeight - spacing.xl
            ? anchor.y - LIST_GAP - listHeight
            : anchor.y + anchor.height + LIST_GAP
        : 0;
    const initialOffset = Math.max(0, (selectedIndex - Math.floor(MAX_VISIBLE_ROWS / 2)) * ROW_HEIGHT);

    return (
        <>
            <Pressable
                ref={fieldRef}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityValue={{ text: options[selectedIndex].label }}
                onPress={open}
                style={({ pressed }) => [
                    styles.field,
                    { borderRadius: radii.md, backgroundColor: palette.surface, opacity: pressed ? 0.7 : 1 },
                ]}
            >
                <AppText variant="label" gradient={false} style={{ fontSize: 18, lineHeight: 24, fontFamily: typography.family.medium }}>
                    {options[selectedIndex].label}
                </AppText>
                <Ionicons name={anchor ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSecondary} />
            </Pressable>

            <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
                <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
                {anchor && (
                    <View
                        style={[
                            styles.list,
                            {
                                top: listTop,
                                left: anchor.x,
                                width: anchor.width,
                                height: listHeight,
                                borderRadius: radii.md,
                                backgroundColor: palette.surfaceSolid,
                            },
                        ]}
                    >
                        <ScrollView contentOffset={{ x: 0, y: initialOffset }} showsVerticalScrollIndicator={false}>
                            {options.map((o) => {
                                const isSelected = o.value === selected;
                                return (
                                    <Pressable
                                        key={o.value}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => {
                                            onSelect(o.value);
                                            close();
                                        }}
                                        style={({ pressed }) => [
                                            styles.row,
                                            { paddingHorizontal: spacing.lg },
                                            pressed && { backgroundColor: palette.surface },
                                        ]}
                                    >
                                        <AppText
                                            variant="label"
                                            gradient={false}
                                            color={isSelected ? palette.accent : palette.textPrimary}
                                            style={{
                                                fontSize: 16,
                                                lineHeight: 22,
                                                fontFamily: isSelected ? typography.family.bold : typography.family.regular,
                                            }}
                                        >
                                            {o.label}
                                        </AppText>
                                        {isSelected && <Ionicons name="checkmark" size={18} color={palette.accent} />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    field: {
        flex: 1,
        height: 56,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    list: {
        position: 'absolute',
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 8,
    },
    row: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
