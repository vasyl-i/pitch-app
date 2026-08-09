import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { GuidedStep, LessonSlot } from '@/features/learning';
import { SLOT_LABELS, useLessonSessionStore } from '@/features/learning';
import { AppText } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { todayColor } from '../todayPalette';
import { PillButton } from './PillButton';

// Cards read as physical, opaque pastel sheets — a second deliberate break from
// the screen's translucent-dark surface language, same exception HeroFocusCard
// already makes for its light banner. Hues are the palette's existing "Deep"
// glyph tones and secondary accents, just promoted to fill duty; lime is left
// out so it stays legible as the one CTA/active-state accent everywhere else.
const HUES = [todayColor.blueDeep, todayColor.lavenderDeep, todayColor.indigoDeep, todayColor.peach, todayColor.coral];

// dark ink for text sitting on these light pastel fills — same rgb triple
// HeroFocusCard uses for its own light-banner text, at graduated alphas
const inkOnPastel = (alpha: number) => `rgba(43, 32, 56, ${alpha})`;

// blends toward a target color at full opacity — used instead of RN `opacity`
// for "faded" cards, since these overlap the card above them: a genuinely
// transparent card lets the covered card's text ghost through the seam
function mix(hex: string, target: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(target.slice(1), 16);
  const blend = (shift: number) => {
    const from = (a >> shift) & 255;
    const to = (b >> shift) & 255;
    return Math.round(from + (to - from) * amount);
  };
  return `rgb(${blend(16)}, ${blend(8)}, ${blend(0)})`;
}

const lighten = (hex: string, amount: number) => mix(hex, '#FFFFFF', amount);
const fadeToBg = (hex: string, amount: number) => mix(hex, todayColor.bg, amount);

const CARD_RADIUS_BUMP = 8; // radii.lg (24) + this puts cards in the 28–36px range the redesign calls for
const CARD_OVERLAP = 36; // ~25% of a typical card's rendered height, so sheets read as a physical stack

type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

export function PlanCard({
  steps,
  completedSlots,
  planReady,
  allDone,
  doneCount,
  onPrimaryAction,
  onStepPress,
  onViewAll,
}: {
  steps: GuidedStep[];
  completedSlots: LessonSlot[];
  planReady: boolean;
  allDone: boolean;
  doneCount: number;
  onPrimaryAction: () => void;
  onStepPress: (step: GuidedStep) => void;
  onViewAll: () => void;
}) {
  const { typography, spacing } = useTheme();
  const activeSlot = useLessonSessionStore((s) => s.activeSlot);

  // the next not-yet-done step in original order — same rule `nextGuidedStep`
  // uses, kept in sync here so the "Ready" card always matches the CTA below
  const nextSlot = steps.find((s) => !completedSlots.includes(s.slot))?.slot ?? null;

  // completed cards float to the top of the stack, closest to the section
  // title; in-progress/ready/upcoming sink toward the CTA button below. Each
  // card keeps the hue tied to its original position so reordering doesn't
  // recolor the deck
  const ordered = steps
    .map((step, index) => {
      const done = completedSlots.includes(step.slot);
      const status: StepStatus = done
        ? 'completed'
        : step.slot === activeSlot
          ? 'in-progress'
          : step.slot === nextSlot
            ? 'ready'
            : 'upcoming';
      return { step, hue: HUES[index % HUES.length], status };
    })
    .sort((a, b) => Number(b.status === 'completed') - Number(a.status === 'completed'));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText color={todayColor.ink} style={{ fontFamily: typography.family.medium, fontSize: 16 }}>
          Today's plan
        </AppText>
        <Pressable onPress={onViewAll} hitSlop={8}>
          <AppText color={todayColor.orange} style={{ fontFamily: typography.family.medium, fontSize: 14 }}>
            More practice
          </AppText>
        </Pressable>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        {ordered.map(({ step, hue, status }, i) => (
          <StepCard
            key={step.slot}
            step={step}
            status={status}
            hue={hue}
            index={i}
            onPress={() => onStepPress(step)}
          />
        ))}
        {!planReady && (
          <AppText color={todayColor.inkSecondary} variant="caption" style={{ paddingVertical: spacing.md }}>
            Putting today’s session together…
          </AppText>
        )}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        {allDone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={todayColor.orange} />
            <AppText color={todayColor.inkSecondary} style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>
              Practice complete — great work. Come back tomorrow, or explore freely below.
            </AppText>
          </View>
        ) : (
          <PillButton
            title={doneCount > 0 ? 'Continue today’s practice' : 'Start today’s practice'}
            disabled={!planReady || steps.length === 0}
            onPress={onPrimaryAction}
          />
        )}
      </View>
    </View>
  );
}

const STATUS_LABEL: Partial<Record<StepStatus, string>> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  ready: 'Ready',
};

function StepCard({
  step,
  status,
  hue,
  index,
  onPress,
}: {
  step: GuidedStep;
  status: StepStatus;
  hue: string;
  index: number;
  onPress: () => void;
}) {
  const { typography, spacing, radii } = useTheme();

  const done = status === 'completed';
  // every fill stays fully opaque — cards overlap the one above them, so real
  // transparency would let its covered text ghost through the seam. "Faded"
  // and "done" states are baked into the color itself instead: upcoming cards
  // are a paler mix of the hue, completed cards are mixed toward the dark
  // backdrop (muted, lower-emphasis), current/ready/in-progress get the hue
  // at full strength.
  const background = done ? fadeToBg(hue, 0.55) : status === 'upcoming' ? lighten(hue, 0.38) : hue;
  const label = STATUS_LABEL[status];

  const pillBg = done ? 'rgba(247, 245, 251, 0.16)' : inkOnPastel(0.12);
  const pillText = done ? todayColor.ink : inkOnPastel(0.92);
  const titleColor = done ? todayColor.inkSecondary : inkOnPastel(0.92);
  const secondaryColor = done ? todayColor.inkFaint : inkOnPastel(0.68);
  const metaColor = done ? todayColor.inkFaint : inkOnPastel(0.55);
  const chevronColor = done ? todayColor.inkFaint : inkOnPastel(0.45);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 70).springify().damping(18).mass(0.9)}
      layout={LinearTransition.springify().damping(18).mass(0.9)}
      style={{
        marginTop: index === 0 ? 0 : -CARD_OVERLAP,
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={done}
        style={({ pressed }) => [
          {
            borderRadius: radii.lg + CARD_RADIUS_BUMP,
            backgroundColor: background,
            padding: spacing.xl,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 18,
          },
          pressed && !done && { opacity: 0.9 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <AppText
            style={{ flex: 1, marginRight: spacing.sm, fontFamily: typography.family.bold, fontSize: 24, lineHeight: 29, letterSpacing: -0.3 }}
            color={titleColor}
          >
            {step.title}
          </AppText>

          {label && (
            <Animated.View
              key={status}
              entering={FadeInUp.duration(220)}
              style={{ backgroundColor: pillBg, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {done && <Ionicons name="checkmark" size={13} color={pillText} />}
                <AppText style={{ fontFamily: typography.family.medium, fontSize: 12, color: pillText }}>
                  {label}
                </AppText>
              </View>
            </Animated.View>
          )}
        </View>

        <AppText
          style={{ marginTop: 0, fontFamily: typography.family.regular, fontSize: 16, color: secondaryColor }}
        >
          {SLOT_LABELS[step.slot]}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
          <AppText style={{ fontFamily: typography.family.regular, fontSize: 16, color: metaColor }}>
            {step.estMinutes} min
          </AppText>
          {!done && <Ionicons name="chevron-forward" size={16} color={chevronColor} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}
