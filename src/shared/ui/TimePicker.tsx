import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { palette, spacing } from '@/shared/theme';
import { intlLocale } from '@/shared/i18n';
import { AppText } from './AppText';
import { TimeDropdown } from './TimeDropdown';

/**
 * A time of day under a clock-labelled caption: the native spinner on iOS,
 * the themed dropdowns on Android (whose native dialog can't be themed).
 */
export function TimePicker({ label, value, onChange, minuteInterval = 5 }: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minuteInterval?: 5;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.label}>
        <Ionicons name="time-outline" size={18} color={palette.textPrimary} />
        <AppText variant="subtitle" gradient={false}>
          {label}
        </AppText>
      </View>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          style={styles.spinner}
          value={value}
          mode="time"
          display="spinner"
          onChange={(_, selected) => selected && onChange(selected)}
          minuteInterval={minuteInterval}
          themeVariant="dark"
          locale={intlLocale()}
        />
      ) : (
        <TimeDropdown value={value} onChange={onChange} minuteInterval={minuteInterval} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', alignItems: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  spinner: { alignSelf: 'center' },
});
