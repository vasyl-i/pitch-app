import { StyleSheet, View } from 'react-native';
import { spacing } from '@/shared/theme';
import { AppText } from './AppText';
import { BackButton } from './BackButton';

/**
 * a pushed screen's top: the back button, then its title and an optional line
 * under it. Without `onBack` the caller keeps its own (fixed) back button.
 */
export function ScreenHeader({ title, subtitle, onBack, large = false }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** a headline instead of a title, for screens that open a flow */
  large?: boolean;
}) {
  return (
    <View>
      {onBack && <BackButton onPress={onBack} />}
      <AppText variant={large ? 'headline' : 'title'} style={onBack && styles.title}>
        {title}
      </AppText>
      {subtitle !== undefined && (
        <AppText variant="body" style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md },
  subtitle: { marginTop: spacing.xs },
});
