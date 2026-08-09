# Legal & compliance notes — not legal advice

This document summarizes the reasoning behind the app's product boundaries. It is background for engineering and product decisions, not a substitute for a real lawyer — get one before charging money at any real scale.

## 1. The core decision this product is built around
The app never performs vocal separation on copyrighted commercial recordings, and never stores or plays back a derivative instrumental it generated from one. Users bring their own instrumental, sourced however they like, outside the app. This single decision removes the highest-risk part of the "any song, minus track" category of app (the part that resembles what x-minus.pro, LALAL.AI, etc. do) and is why the product is scoped the way it is in the PRD.

## 2. Why this matters, briefly
- A **mechanical license** covers only the composition (melody/lyrics), and is statutory/cheap (~$0.09-0.13/song) — but it doesn't let you touch or manipulate someone's actual master recording.
- Doing that — running AI separation on a copyrighted master to produce an instrumental — needs a **master use license**, which is not statutory, is individually negotiated with labels, and is realistically out of reach for a small team (five-to-six-figure minimum guarantees are typical for real catalog access).
- By never generating or storing that derivative, the app avoids needing that license category entirely.

## 3. What residual risk remains, and how it's handled
- **Chord/key analysis of the instrumental** is not derived from copyrighted vocal content and does not involve creating an audible derivative — it's closer to a "what key is this song in" utility than a karaoke generator. Low risk.
- **The user still needs to have legitimately acquired the instrumental themselves** (they made it, bought a DRM-free file, etc.). The app doesn't verify this — industry-standard practice (see: every vocal remover on the market) is a Terms of Service representation, not verification, because provenance verification of an audio file isn't practically feasible at scale.
- **ToS should require**: user represents they have the right to the file they upload; app is for personal practice use only; app reserves the right to remove content on a valid complaint (DMCA-style process even outside the US, as a consistent policy).
- **Jurisdiction note**: fair-use-style personal-use reasoning is strongest in the US; some jurisdictions (parts of the EU, for instance) don't have an equivalent doctrine. Worth a lawyer's input on your target launch markets specifically.

## 4. App store review risk (distinct from copyright law risk)
Both Apple's App Store and Google Play have review processes that can flag audio-import / music-processing apps even when the legal position is sound, because reviewers are looking for anything resembling unauthorized music distribution or DRM circumvention. Before submission:
- Be ready to clearly explain, in App Store Connect / Play Console review notes, that the app does not separate vocals, does not access streaming service DRM content, and only processes files the user already owns.
- Avoid any UI language that could read as "get free karaoke tracks" or similar — frame everything around practice/coaching, matching the actual product.
- Budget time for at least one rejection-and-resubmission cycle; this is normal for apps in music/audio categories, not a sign something is wrong.

## 5. What NOT to add without revisiting this document
Any of the following would reintroduce the legal exposure this design deliberately avoids — don't add them without a real legal consultation first:
- In-app vocal separation of any kind
- A built-in catalog of pre-made instrumentals for popular commercial songs (this needs actual catalog licensing — see the earlier cost discussion; budget real money and legal time for it)
- Pulling audio from streaming links (Spotify/Apple Music/YouTube) — technically blocked by DRM in the first two cases, and a ToS violation in the third
- Letting users share or publicly post their instrumentals through the app (turns personal-use practice into something closer to distribution)

## 6. Pre-launch checklist
- [ ] ToS drafted with the rights representation + personal-use framing above
- [ ] DMCA-style takedown/complaint process defined, even for non-US launch markets
- [ ] Real IP/entertainment lawyer review before enabling payments
- [ ] App Store / Play Store review notes prepared per section 4
