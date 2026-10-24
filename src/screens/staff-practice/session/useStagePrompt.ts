import { useStaffStore, VERDICT_LABEL } from '@/features/staff-practice';
import { useTranslation } from '@/shared/i18n';

/**
 * What the singer should be doing right now, as a title and subtitle above
 * the staff. Each stage names itself, so it is never ambiguous whether the
 * app is demonstrating, singing along, or testing — and in the two graded
 * stages the subtitle gives way to live per-note feedback. On the built-in
 * speaker the mic also hears the accompaniment; the subtitle points at the
 * one-second fix (headphones).
 */
export function useStagePrompt(keyLabel: string, keyChange: string | null, loop: boolean) {
  const { t } = useTranslation();
  const status = useStaffStore((s) => s.status);
  const lastVerdict = useStaffStore((s) => s.lastVerdict);
  const outputIsolated = useStaffStore((s) => s.outputIsolated);
  const verdict = lastVerdict ? VERDICT_LABEL[lastVerdict.verdict] : null;

  if (status === 'listen') {
    return keyChange
      ? { title: t('staff.prompt.nowIn', { key: keyLabel }), subtitle: t('staff.prompt.listenFirst', { change: keyChange }) }
      : { title: t('staff.prompt.listen'), subtitle: t('staff.prompt.follow') };
  }
  if (status === 'accompanied') {
    return {
      title: t('staff.prompt.accompanied'),
      subtitle: verdict ?? (outputIsolated ? t('staff.prompt.match') : t('staff.prompt.matchHeadphones')),
    };
  }
  return { title: t('staff.prompt.yourTurn'), subtitle: verdict ?? (loop ? t('staff.prompt.looping') : t('staff.prompt.solo')) };
}
