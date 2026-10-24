import { usePaywall, usePremiumStatus } from '@/features/subscription';
import type { RootScreenProps } from '@/app/navigation/types';
import { usePracticeRounds } from './usePracticeRounds';
import { StaffSession } from './session/StaffSession';

/** A piano-roll exercise: one `StaffSession` per round, each in that round's key (see `usePracticeRounds`). */
export function StaffPracticeScreen({ navigation, route }: RootScreenProps<'MelodyPractice'>) {
  const guided = route.params.guided === true;
  const rounds = usePracticeRounds(route.params.exerciseId, guided);
  const premium = usePremiumStatus().isPremium;
  const openPaywall = usePaywall('melody-practice');

  return (
    <StaffSession
      // the round too: a range with room for one key repeats it, and each
      // round still needs a fresh run; not the rate: a new speed restarts the
      // run in place (see useStaffSession)
      key={`${rounds.exercise.id}-${rounds.roundShift}-${rounds.round}`}
      navigation={navigation}
      guided={guided}
      exercise={rounds.exercise}
      shift={rounds.roundShift}
      round={rounds.round}
      rounds={rounds.rounds}
      endless={rounds.endless}
      keyChange={rounds.keyChange}
      ladderSpan={rounds.ladderSpan}
      onRoundDone={rounds.nextRound}
      onRoundRecorded={rounds.saveRoundDone}
      rate={rounds.rate}
      setRate={rounds.setRate}
      direction={rounds.direction}
      setDirection={rounds.setDirection}
      premium={premium}
      onLockedSpeed={openPaywall}
      // loop practice and the Hz readout have no switch on this screen yet
      loop={false}
      showHz={false}
    />
  );
}
