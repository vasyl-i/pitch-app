import type { LocaleShape } from '../../types';
import type { en } from '../en';
import { auth } from './auth';
import { common, nav } from './common';
import { earTraining } from './earTraining';
import { exercise } from './exercise';
import { exercises } from './exercises';
import { home } from './home';
import { journey, weakSpots } from './journey';
import { learning } from './learning';
import { music } from './music';
import { notifications } from './notifications';
import { onboarding } from './onboarding';
import { profile } from './profile';
import { progress } from './progress';
import { session } from './session';
import { sing } from './sing';
import { staff, pitch } from './staff';
import { subscription } from './subscription';
import { vocalRange } from './vocalRange';
export { ukContent } from './content';

export const uk: LocaleShape<typeof en> = {
  auth,
  common,
  nav,
  earTraining,
  exercise,
  exercises,
  home,
  journey,
  weakSpots,
  learning,
  music,
  notifications,
  onboarding,
  profile,
  progress,
  session,
  sing,
  staff,
  pitch,
  subscription,
  vocalRange,
};
