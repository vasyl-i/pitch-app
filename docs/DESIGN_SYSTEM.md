# Design system — Pitch Coach App

## Origin

The visual system started as a one-screen departure: `todayColor` in
`apps/sing-mvp/src/screens/home/todayPalette.ts`, a local palette scoped to
the Today screen while the rest of the app ran on an older cyan/violet
"premium dark-glass" system. After many rounds of iteration Today's look —
near-black background, lime as the one confident accent, borderless cards
separated by tone and shadow, a uniform frosted-glass icon treatment,
sentence-case type, a floating pill nav bar — became the app's system.
`shared/theme/tokens.ts` and `shared/ui/*` were rewritten to match it, and
every other screen absorbed the change by virtue of already consuming those
shared tokens and primitives rather than hardcoding styles.

Today's own `todayColor` still exists as a parallel, slightly richer palette
(see [Today screen's local palette](#today-screens-local-palette) below) —
it's a close cousin of the shared tokens, not a competing system.

## Foundations

All values live in `apps/sing-mvp/src/shared/theme/tokens.ts` and are
consumed via `useTheme()`. **Never hardcode a color, spacing, radius, or
font value in a component** — if the token you need doesn't exist yet, add
it to `tokens.ts` rather than inlining it.

### Color (`palette`)

| Token | Value | Use |
|---|---|---|
| `background` | `#08070C` | App background, near-black |
| `backgroundElevated` | `#0D0D14` | Rarely used elevated surface |
| `surface` | `rgba(255,255,255,0.06)` | Default card fill |
| `surfaceElevated` | `rgba(255,255,255,0.10)` | Slightly brighter surface |
| `surfaceSolid` | `#131319` | Opaque dark surface |
| `border` / `borderSubtle` | `rgba(255,255,255,0.16 / 0.09)` | Legacy — see [No borders](#no-borders) |
| `textPrimary` | `#ffffff` | Primary text |
| `textSecondary` | `rgba(255,255,255,0.64)` | Secondary text |
| `textFaint` | `rgba(255,255,255,0.40)` | Tertiary/faint text |
| `accent` | `#C8DA59` (lime) | **The** accent — buttons, active states, progress fills, links |
| `accentSecondary` | `#8B7CFF` (violet) | Reserved for "premium" identity (badges, premium glow) — deliberately *not* the same color as the primary accent, so premium signaling stays visually distinct from primary actions |
| `accentTertiary` | `#4C6FFF` | Rarely used, mostly historical |
| `onAccent` | `#000000` | Text/icons on top of the lime accent |
| `warning` | `#e8c97a` | Warnings |
| `danger` | `#ff6d5c` | Errors, "out of tune" |
| `buttonPrimaryBg` / `buttonPrimaryText` | `#C8DA59` / `#000000` | `Button`'s primary variant |

### Ambient glow (`glow`)

The corner-bleed atmospheric background every screen gets by default (see
`AppBackground`) is built from five hues, all Today screen originals:

```
indigo: '#7B7FE0'   lavender: '#B79FE8'   blue: '#6FA0E8'
coral:  '#EE8672'   peach:    '#F3C79B'
```

### Gradients (`gradient`)

- `accent`: `['#C8DA59', '#9FB84A']` — active `ChipGroup` chips, lime glow shadows.
- `cardSheen`: a faint white sheen, rarely used.

### Typography (`typography`)

Font is **Satoshi**, bundled as static TTFs and loaded by PostScript name
(`Satoshi-Regular` / `-Medium` / `-Bold` / `-Black`) — `fontWeight` numbers
do **not** reliably apply on this custom font; always set `fontFamily`
explicitly (`typography.family.bold`, etc.) when you need real boldness, not
`fontWeight: '700'`. This has bitten the design work more than once — see
[Gotchas](#gotchas).

Base sizes: `xs: 12, sm: 14, md: 16, lg: 18, xl: 26, display: 72`.

**Sentence case only, everywhere.** No `UPPERCASE` section labels, no
`.toUpperCase()` calls on user-facing strings. This was a deliberate,
screen-by-screen sweep — if you find a stray uppercase label, it's a bug, not
a style choice.

### Spacing & radii

`spacing`: `xs 4, sm 8, md 12, lg 16, xl 24, xxl 32`.
`radii`: `sm 8, md 12, lg 24, pill 220` (`pill` is the signature fully-rounded shape).

### Blur (`blur`)

expo-blur intensity presets: `card 30, sheet 55, nav 90`.

## Core principles

### No borders

Cards, chips, buttons, and the back button separate from what's behind them
using translucent fill + a soft shadow — never `borderWidth`. If you're
reaching for a border, reach for a shadow or a stronger surface tint
instead. (`palette.border`/`borderSubtle` still exist for the rare
functional exception — e.g. a radio button's ring, a piano key's edge — not
for card/container chrome.)

### One accent color for actions, a separate one for "Premium"

Lime (`palette.accent`) is the only color used to say "this is the primary
action, this is active, this is progress." Violet (`accentSecondary`) is
reserved for Premium/paywall signaling (`PremiumBadge`) specifically so the
two meanings never collide — a lime element always means "do this," a
violet element always means "this is a Premium thing."

### One icon language: `IconBubble`

`shared/ui/IconBubble.tsx` — a white glyph on a small frosted-glass blurred
circle — is the uniform treatment for leading/status icons across list rows
and stat tiles app-wide (Weak spots, Journey milestones, Profile rows,
Perfect-exercises, onboarding reason cards, etc.). No per-category color
coding; the icon's *name* carries the meaning, not its color.

**Use plain glyphs, not the filled `-circle` variants** (`play`, not
`play-circle`; `checkmark`, not `checkmark-circle`). The filled variants draw
their own solid disc as part of the glyph — forced to a single white color
by `IconBubble`, that renders as an inverted solid-white blob instead of
sitting on the intended dark blur circle. This bit `JourneyAreaScreen`'s
milestone rows during the rollout; if a bubble icon looks like a plain white
disc instead of an icon-on-a-dark-circle, this is why.

Two exceptions, both intentional:
- **Stat tiles** (`ProgressScreen`'s Perfect runs/Days practiced/Practice
  time) use a plain lime-colored icon with *no* bubble — a different UI role
  (a compact number+icon tile, not a list row) with its own reference look.
- **Today screen** doesn't use `IconBubble` in `PlanCard`'s step-group rows
  (that component currently renders label/minutes/progress with no icon at
  all) — check the current file before assuming it matches other screens;
  this one has been hand-edited outside the main rollout.

### Icon-as-button, no redundant controls

Where a list row supports a single obvious action (replay, practice,
open), the row itself is the `Pressable` and the icon is the visual cue —
never a separate icon *plus* a text button doing the same thing.
`PracticeLibraryScreen`'s `MelodyRow` and `JourneyAreaScreen`'s
`MilestoneRow` both follow this now; `MilestoneRow` used to pair its status
icon with a redundant "Replay"/"Practice" pill, which was removed.

### Line-height clipping

When you bump an `AppText`'s `fontSize` well past its variant's default
(most variants' `lineHeight` is tuned for their own default size, not
whatever you override it to), **set an explicit `lineHeight`** or tall
glyphs (`$`, digits, ascenders) clip at the top. This has come up twice —
once on a price string, once on a stat-tile value — both times because a
custom `fontSize` was set without a matching `lineHeight`.

## Component catalog (`shared/ui/`)

- **`AppText`** — the only way text should render. Variants: `display`
  (72px), `title` (26px bold), `body` (16px regular, secondary color),
  `label` (16px medium, primary color), `caption` (12px regular, faint).
  Pass `color` to override; pass `style.fontFamily` to override weight.
- **`Screen`** — scaffold: background color, the default `AppBackground`
  glow (or a custom `backdrop` override, as Today uses), safe area, base
  padding.
- **`AppBackground`** — the five-blob atmospheric corner glow, extracted
  verbatim from Today's original `TodayBackground`. Every screen gets this
  unless it passes its own `backdrop` to `Screen`.
- **`Card`** — the glass card primitive. `variant="default"` or
  `"highlighted"` (lime-tinted, for a selected/emphasized state). No
  border; blur + tint fill + shadow. Forwards `onLayout` (needed when a
  child, e.g. an `Image`, must be sized off the card's actual rendered
  height).
- **`Button`** — pill button. `variant="primary"` (lime fill, lime glow,
  black text) or `"ghost"` (translucent glass, no border, primary-color
  text).
- **`ChipGroup`** — titled group of selectable pills. Active chip gets the
  `gradient.accent` lime fill; inactive chips are translucent glass, no
  border.
- **`IconBubble`** — see [One icon language](#one-icon-language-iconbubble)
  above.
- **`BackButton`** — 44px circular glass button, top-left of stack screens
  that hide the native header.

## Bottom navigation (`app/navigation/FloatingTabBar.tsx`)

Not part of `shared/ui` (it's wired directly into `RootNavigator`'s
`Tab.Navigator`), but is shared chrome — every tab gets it. Custom `tabBar`
render (not the default styled tab bar) so the active indicator can be a
single `Animated.View` circle that spring-slides between tabs rather than
popping in per-icon.

- Floating pill, 76px tall, 18px side margins, 38px radius.
- Material: `blur.nav` (90) blur + a translucent near-black gradient
  (`rgba(7,7,12,0.44 → 0.4)`, deliberately the same rgb as
  `palette.background` so the bar reads as the page's own surface made
  translucent) + a faint top highlight — matte, not glassy.
- Active tab: a 58px lime circle (`#C8DA59`) with a lime glow shadow,
  spring-animated position.
- Icons: **Feather** (from `@expo/vector-icons`), not Ionicons — Feather's
  2px rounded-stroke style matches the "minimal outlined icon" language the
  nav specifically calls for; Ionicons stays the app's icon set everywhere
  else.

## Today screen's local palette

`screens/home/todayPalette.ts` (`todayColor`) remains separate from
`shared/theme/tokens.ts`. It shares the same near-black base and lime
accent but carries its own warm secondary family (peach/coral/orange, all
aliased to the shared lime — `orange: '#C8DA59'`) plus a few Today-specific
concepts with no shared equivalent yet:

- `banner` / `bannerDeep` / `bannerLight` — the light orchid hue used only
  by the hero card's background image treatment.
- `inkOnBanner` / `inkOnAccent` — dark text colors for content sitting on a
  light surface (the hero card, the lime primary button) where the page's
  usual off-white `ink` has no contrast.

Today's own primitives (`ui/SoftCard.tsx`, `ui/PillButton.tsx`) mirror
`shared/ui/Card` and `Button` but read from `todayColor` instead of
`palette`. If a value needs to exist in both places, keep them in sync by
hand — there's no automatic link between the two palettes.

## Gotchas (things that have already gone wrong once)

- **Custom-font boldness**: use `fontFamily: typography.family.bold`, not
  `fontWeight: '700'`, on Satoshi text.
- **Filled `-circle` Ionicons inside `IconBubble`**: use the plain glyph
  (`play`, `checkmark`), not `play-circle`/`checkmark-circle`.
- **`fontSize` without `lineHeight`**: set both together whenever you
  override an `AppText` size significantly past its variant default.
- **`resizeMode="cover"` on a wide background image inside a narrower
  card**: center-crop will likely cut off any off-center decorative detail
  (this happened twice, on the hero card and the free-trial card). Measure
  the card's actual rendered size (`onLayout`) and anchor the image to
  whichever edge holds the interesting part of the source image instead of
  trusting the default center crop.
- **Metro Fast Refresh can serve a stale render** for a color-only change
  even after the source is correct — if a screenshot doesn't match the
  code, force-terminate and relaunch the app before assuming the code is
  wrong.
