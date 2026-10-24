import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { palette } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n';
import { FloatingTabBar } from './FloatingTabBar';
import { TabBlurTarget, TabBlurTargetsProvider } from './tabBlurTargets';
import { AccountNavigator, ExercisesNavigator, HomeNavigator, ProgressNavigator } from './stacks';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS = {
  home: require('../../../assets/bottom-bar/home.png'),
  exercises: require('../../../assets/bottom-bar/ear.png'),
  progress: require('../../../assets/bottom-bar/Chart.png'),
  account: require('../../../assets/bottom-bar/gear.png'),
};

/** a tab's icon image, tinted by the tab bar */
const tabIcon =
  (source: ImageSourcePropType) =>
  ({ color, size }: { color: string; size: number }) => <Image source={source} style={[styles.icon, { width: size, height: size, tintColor: color }]} />;

const SCREEN_OPTIONS = {
  headerShown: false,
  sceneStyle: { backgroundColor: palette.background },
  // the real bar is FloatingTabBar, drawn over the content
  tabBarStyle: { position: 'absolute' as const, height: 0, borderTopWidth: 0, elevation: 0 },
};

/** The four tabs under the floating bar; each tab's content is a blur target for the bar. The Sing tab is hidden for now. */
export function MainTabs() {
  const { t } = useTranslation();
  return (
    <TabBlurTargetsProvider>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenLayout={({ route, children }) => (
          <TabBlurTarget routeKey={route.key} backgroundColor={palette.background}>
            {children}
          </TabBlurTarget>
        )}
        screenOptions={SCREEN_OPTIONS}
      >
        <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: t('nav.home'), tabBarIcon: tabIcon(TAB_ICONS.home) }} />
        <Tab.Screen name="ExercisesTab" component={ExercisesNavigator} options={{ title: t('nav.exercises'), tabBarIcon: tabIcon(TAB_ICONS.exercises) }} />
        <Tab.Screen name="ProgressTab" component={ProgressNavigator} options={{ title: t('nav.progress'), tabBarIcon: tabIcon(TAB_ICONS.progress) }} />
        <Tab.Screen name="AccountTab" component={AccountNavigator} options={{ title: t('nav.account'), tabBarIcon: tabIcon(TAB_ICONS.account) }} />
      </Tab.Navigator>
    </TabBlurTargetsProvider>
  );
}

const styles = StyleSheet.create({
  icon: { resizeMode: 'contain' },
});
