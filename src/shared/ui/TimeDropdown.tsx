import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radii, spacing } from '@/shared/theme';
import { AppText } from './AppText';
import { formatHour, useTranslation } from '@/shared/i18n';

import { OptionList, type Anchor, type Option } from './DropdownOptionList';

function hourOptions(): Option[] {
  return Array.from({ length: 24 }, (_, h) => ({ value: h, label: formatHour(h) }));
}

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
  const { t } = useTranslation();
  const minute = Math.floor(value.getMinutes() / minuteInterval) * minuteInterval;

  const update = (h: number, m: number) => {
    const next = new Date(value);
    next.setHours(h, m, 0, 0);
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Dropdown
        accessibilityLabel={t('common.reminderHour')}
        options={hourOptions()}
        selected={value.getHours()}
        onSelect={(h) => update(h, minute)}
      />
      <AppText variant="heading" color={palette.textSecondary} gradient={false}>
        :
      </AppText>
      <Dropdown
        accessibilityLabel={t('common.reminderMinute')}
        options={minuteOptions(minuteInterval)}
        selected={minute}
        onSelect={(m) => update(value.getHours(), m)}
      />
    </View>
  );
}

/** a field showing the selection; tapping it opens the options in a list anchored to it */
function Dropdown({ options, selected, onSelect, accessibilityLabel }: {
  options: Option[];
  selected: number;
  onSelect: (value: number) => void;
  accessibilityLabel: string;
}) {
  const { t } = useTranslation();
  const fieldRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === selected));

  const open = () => fieldRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  const close = () => setAnchor(null);

  return (
    <>
      <Pressable
        ref={fieldRef}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: options[selectedIndex].label }}
        onPress={open}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <AppText variant="subtitle" gradient={false}>
          {options[selectedIndex].label}
        </AppText>
        <Ionicons name={anchor ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSecondary} />
      </Pressable>

      <Modal visible={anchor != null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('common.close')} />
        {anchor && (
          <OptionList
            anchor={anchor}
            options={options}
            selected={selected}
            selectedIndex={selectedIndex}
            onSelect={(value) => {
              onSelect(value);
              close();
            }}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm },
  field: {
    flex: 1,
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    backgroundColor: palette.surface,
  },
  pressed: { opacity: 0.7 },
});
