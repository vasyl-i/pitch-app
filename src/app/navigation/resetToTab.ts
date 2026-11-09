import { CommonActions, StackActions, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList, MainTabParamList } from './types';

/**
 * Go back to Main with a specific tab selected, leaving nothing stacked above
 * it (practice sessions, modals, etc.).
 *
 * When Main is already in the stack (the usual case: a session was started
 * from a tab) it is popped back to, so the screens above slide away and the
 * tab the user left is revealed as it was, still mounted. A `reset` would
 * instead mount a brand-new Main — a second Today screen sliding in over the
 * old one, replaying its entering animations — and discard the old one.
 * Without a Main in the stack (leaving onboarding) it falls back to a reset.
 */
export function resetToTab(
  navigation: NavigationProp<RootStackParamList>,
  tab: keyof MainTabParamList,
  params?: MainTabParamList[keyof MainTabParamList],
) {
  const hasMain = navigation.getState()?.routes.some((r) => r.name === 'Main');
  if (hasMain) {
    navigation.dispatch(StackActions.popTo('Main', { screen: tab, ...(params ? { params } : {}) }));
    return;
  }
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            routes: [{ name: tab, ...(params ? { params } : {}) }],
          },
        },
      ],
    }),
  );
}
