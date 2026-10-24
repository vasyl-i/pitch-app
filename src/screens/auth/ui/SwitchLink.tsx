import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/shared/ui';
import { palette } from '@/shared/theme';

/** "No account? Create one" — a quiet lead-in and an accent action, one tap target */
export function SwitchLink({ lead, action, onPress, disabled }: { lead?: string; action: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.link}>
      {lead !== undefined && <AppText variant="body">{lead}</AppText>}
      <AppText variant="body" color={palette.accent}>
        {action}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
