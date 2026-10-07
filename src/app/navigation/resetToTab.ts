import { CommonActions, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList, MainTabParamList } from './types';

/**
 * Reset the root stack back to Main with a specific tab selected.
 * Clears all screens stacked above Main (practice sessions, modals, etc.)
 * so the tab navigator is the only screen in the stack.
 */
export function resetToTab(
  navigation: NavigationProp<RootStackParamList>,
  tab: keyof MainTabParamList,
  params?: MainTabParamList[keyof MainTabParamList],
) {
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
