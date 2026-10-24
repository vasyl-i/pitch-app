import { palette } from '@/shared/theme';
import { todayColor } from '../todayPalette';

export type StepStatus = 'completed' | 'in-progress' | 'ready' | 'upcoming';

// Cards read as physical, opaque pastel sheets — a second deliberate break from
// the screen's translucent-dark surface language, same exception HeroFocusCard
// already makes for its light banner. Hues are the palette's existing "Deep"
// glyph tones and secondary accents, just promoted to fill duty; lime is left
// out so it stays legible as the one CTA/active-state accent everywhere else.
export const HUES = [todayColor.blueDeep, todayColor.lavenderDeep, todayColor.indigoDeep, todayColor.peach, todayColor.coral];

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

/**
 * A step card's colours. Every fill stays fully opaque — cards overlap the
 * one above them, so real transparency would let its covered text ghost
 * through the seam. "Faded" and "done" are baked into the colour instead:
 * upcoming cards are a paler mix of the hue, completed ones are mixed toward
 * the dark backdrop, current/ready/in-progress get the hue at full strength.
 */
export function stepCardColors(hue: string, status: StepStatus) {
  const done = status === 'completed';
  return {
    background: done ? mix(hue, todayColor.bg, 0.55) : status === 'upcoming' ? mix(hue, palette.white, 0.38) : hue,
    pill: done ? 'rgba(247, 245, 251, 0.16)' : inkOnPastel(0.12),
    pillText: done ? todayColor.ink : inkOnPastel(0.92),
    title: done ? todayColor.inkSecondary : inkOnPastel(0.92),
    secondary: done ? todayColor.inkFaint : inkOnPastel(0.68),
    meta: done ? todayColor.inkFaint : inkOnPastel(0.55),
    chevron: done ? todayColor.inkFaint : inkOnPastel(0.45),
  };
}
