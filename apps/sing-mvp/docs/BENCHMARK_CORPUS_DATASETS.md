# Public Singing Datasets — Evaluation for the Pitch Benchmark

Status: evaluation only, 2026-08-02. **Nothing has been downloaded or integrated.**
Companion to [PITCH_BENCHMARK.md](PITCH_BENCHMARK.md) and
[benchmark-corpus/real/README.md](../benchmark-corpus/real/README.md).

Question: which publicly available singing datasets could supply real-vocal
benchmark material, given that this is commercial software and the corpus must
slot into the existing ingestion path?

---

## 1. Verdict first

**Recommended minimum set: VocalSet + Dagstuhl ChoirSet.**
Optional cheap third: vocadito.

| | VocalSet | Dagstuhl ChoirSet | vocadito |
|---|---|---|---|
| Licence | CC BY 4.0 | CC BY 4.0 | CC BY 4.0 |
| Commercial use | yes | yes (but see §5) | yes |
| Singers | 20 professional | 13 amateur/semi-pro, SATB | multiple, mixed training |
| Size | 2.1 GB, ~10.1 h | 5.1 GB, 55 min | 58.5 MB, 40 excerpts |
| Sample rate | **44.1 kHz** | **22.05 kHz** | not confirmed |
| f0 annotations | **none** | pYIN + CREPE; **manual** for 2 quartets | pYIN + human correction (Tony) |
| Fills our gap | sustained straight tones, technique stress | low band, reference-grade annotation | device/real-world diversity |

The two-dataset recommendation is driven by one fact: **the accuracy metric needs
deliberately straight sustained notes, and only VocalSet systematically contains
them.** Everything else in the field is expressive singing, which our harness can
measure for tracking but — by the measurement in
[PITCH_BENCHMARK.md §5](PITCH_BENCHMARK.md) — cannot use for cents accuracy.

---

## 2. The recommended two

### VocalSet — the accuracy backbone

20 professional singers performing 17 vocal techniques across scales, arpeggios,
long tones and excerpts, in all five vowels. (Sources disagree on the male/female
split: the ISMIR paper abstract says 11 male / 9 female, the Zenodo page says the
reverse. Immaterial to the recommendation.)

Why it fits better than anything else found:

- **It contains a `straight tone` technique and `long tones` context.** That is
  precisely our `sustained` category, produced deliberately by trained singers —
  the material our accuracy figure requires and that no other public dataset
  systematically provides.
- **It also contains `vibrato`, `breathy`, `vocal fry`, `trill`, `trillo`,
  `belt`, `lip trill`.** That is our `expressive` category and, better, a
  ready-made robustness suite: vocal fry and breathiness are exactly the
  conditions synthesis cannot fake and where our detector's confidence measure
  is weakest.
- **44.1 kHz** — matches the pipeline's capture rate exactly, so it loads with no
  resampling and no argument about resampler artefacts.
- 20 professional voices is a far better spread of larynx behaviour than the
  owner's single voice.

The one weakness — **no f0 annotations** — lands in the best possible place. Our
ingestion already annotates with pYIN, and we measured pYIN to be near-exact
(≤0.02¢) on *clean steady tones*. So on precisely the material we would use for
accuracy, the annotator's error floor is negligible. The techniques we would
annotate for tracking only (fry, vibrato) are the ones where pYIN is weaker, and
those never feed an accuracy number anyway.

### Dagstuhl ChoirSet — the low band and the reference-grade annotation

13 amateur and semi-professional singers in SATB, performing Bruckner's *Locus
Iste* and Hristov's *Tebe Poem* plus systematic scale/chord/intonation exercises.
55 min 30 s over 81 takes.

- **Tessituras: Bass F2–C4, Tenor C3–E4, Alto G3–B4, Soprano B3–G5** (87–784 Hz).
  The bass parts populate our `low` band (65–130 Hz), which the owner's G3–F5
  range cannot reach at all and which VocalSet may cover thinly.
- **Reference-grade annotations exist**: F0 was extracted with pYIN and CREPE for
  all close-up mics, and a sound engineer produced **manual** F0 annotations in
  Tony for all voices of two quartet recordings. Those map to our
  `method: 'manual'`, `verified: true` — the first genuinely trusted real
  material we would have.
- **Larynx (contact throat) microphone** recordings alongside headset and dynamic
  mics. A contact mic is nearly immune to room acoustics, which makes it the
  closest thing to an EGG reference in a permissively licensed singing dataset,
  and it gives a same-take comparison of clean vs. room-contaminated capture.
- Includes deliberate intonation exercises — directly relevant to a tuning app.

Its cost is **22.05 kHz**, which our loader rejects. See §4.

### vocadito — optional, cheap, real-world diversity

40 short solo excerpts, 7 languages, singers of varying training, **recorded on a
variety of devices**. f0 annotated in Tony (pYIN then manual correction by a
trained musician), so `method: 'pyin-verified'`, `verified: true`.

58.5 MB — small enough that including it costs nothing. It is expressive singing,
so it contributes to tracking only. Its value is device and room diversity:
consumer phone recordings from real users are exactly the condition our synthetic
corpus cannot represent, and it is the closest public proxy for our own users'
capture conditions.

---

## 3. Rejected, and why

| Dataset | Licence | Why rejected |
|---|---|---|
| **MDB-stem-synth** | CC BY-**NC** 4.0 | The technically ideal option — 230 resynthesized stems with *perfect* f0 by construction, the only public dataset whose reference is exact rather than annotated. Non-commercial licence makes it unusable here. Genuine loss. |
| **MedleyDB pitch / melody** | CC BY-NC-SA 4.0 | Non-commercial. |
| **Saraga Carnatic / Hindustani** | CC BY-NC-SA 4.0 | Non-commercial. Would otherwise add valuable non-Western ornamentation. |
| **Orchset, cante100, TONAS** | CC BY-NC-SA / custom | Non-commercial or bespoke terms. |
| **iKala** | custom | Withdrawn from distribution; bespoke research terms. |
| **MIR-1K** | **undiscoverable** | Frequently cited, 1000 clips with 10 ms pitch annotations, but no licence is stated in any indexed source and the host (mirlab.org) refused connection during this review. A dataset whose terms cannot be established is unusable in commercial software regardless of technical merit. |
| **Annotated-VocalSet** | CC BY 4.0 | Adds f0/note/MIDI annotations to VocalSet. Tempting shortcut, but the Zenodo record does not state how the annotations were produced or whether any human verified them. Until that is established from the paper, our own pYIN pass is the better-understood option — we know its error floor because we measured it. Worth revisiting. |

---

## 4. Integration effort against our actual framework

Our loader requires: exactly 44.1 kHz, mono, an `<id>.wav` + `<id>.json` pair,
mandatory `provenance {source, license, consent}`, a declared `category`, and an
`annotation {method, verified, hopSec, f0Hz}`.

**VocalSet — low effort.** 44.1 kHz already. Files are named by singer, technique
and context, so `category` can be assigned mechanically: `straight`/`long tone`
→ `sustained`, everything else → `expressive`. Then run the existing
`annotate_vocal.py` over each file. No new code beyond a small mapping script.

**Dagstuhl ChoirSet — medium effort, one decision.** F0 comes as CSV, so a
converter to our sidecar format is needed (straightforward). The real question is
the **22.05 kHz sample rate**, which the loader rejects on the principle that a
resampler in the measurement path produces artefacts indistinguishable from
detector error.

That principle is worth re-examining for this specific case rather than applied
reflexively. Our pipeline decimates 44.1 kHz by 4 through an FIR cutting at
~5.5 kHz, so **everything above 5.5 kHz is discarded by the pipeline itself**. A
22.05 kHz file carries content up to 11 kHz — twice what the detector will ever
use. Upsampling 22.05 → 44.1 kHz is therefore information-preserving *in the only
band that reaches the detector*, and the artefacts the rule guards against live
above it. My recommendation is to allow ingestion-time upsampling for this
dataset specifically, record it in the annotation metadata (a new
`resampledFrom` field), and report those recordings separately until a
same-material comparison shows it makes no difference. That keeps the rule's
intent — no unexamined resampling — without discarding the only permissive
source of low-band and reference-grade material.

**vocadito — low effort**, assuming its rate is 44.1 kHz (unconfirmed; if not,
same decision as Dagstuhl). f0 CSVs convert directly; `pyin-verified` /
`verified: true`.

### Storage

We just moved corpus audio to Git LFS. Whole datasets total ~7.3 GB, which is a
lot to put in LFS for material that is mostly redundant for our purposes.
**Curate rather than import wholesale**: from VocalSet, the `straight` and
`long tone` files plus a robustness sample of fry/breathy/vibrato; from Dagstuhl,
the two manually annotated quartet takes plus bass-part material. That is likely
under 500 MB and covers everything the recommendation rests on.

---

## 5. Two flags worth taking seriously

**Consent scope vs. licence scope (Dagstuhl ChoirSet).** The dataset is CC BY 4.0,
which permits commercial use. But the published description states that singers
consented to publication of the material *for research purposes*. A CC BY licence
and a research-scoped consent are not the same instrument, and where they differ
the narrower one describes what the singers actually agreed to. Before this
dataset is used in commercial-product benchmarking, someone should read the
dataset's own documentation on consent and decide — this is exactly the class of
question `LEGAL_AND_COMPLIANCE.md` exists for. I am flagging it, not resolving
it; I am not qualified to give the legal read.

**Attribution obligations.** CC BY requires credit. Internal benchmarking is not
redistribution, so the obligation is light while the corpus stays private — but
if corpus files are committed to a repository that later becomes public, that is
redistribution and attribution becomes mandatory. Our `provenance.license` field
already carries the information; the practical step is to keep a top-level
attribution file if the repo's visibility ever changes.

---

## 6. Coverage after adopting the recommendation

Against our band structure, combining VocalSet + Dagstuhl + the owner's own
sustained set:

| Band | Covered by | Confidence |
|---|---|---|
| sub-low (<65 Hz) | nothing | **not covered.** Below C2 is outside normal singing; only fry and extreme basses reach it. Synthetic coverage stays the only evidence, which is acceptable — the band exists to document degradation below our declared floor. |
| low (65–130) | Dagstuhl basses (F2 = 87 Hz up), VocalSet male singers | good |
| mid (130–330) | all three sources | strong |
| upper-mid (330–660) | all three sources | strong |
| high (660–1000) | Dagstuhl sopranos to G5 (784 Hz), VocalSet female professionals | adequate; thin above 800 Hz |
| above-range (>1000) | possibly VocalSet soprano scales | **unverified.** Cannot be confirmed without downloading and measuring, which this review deliberately did not do. |

So the recommendation materially improves four of six bands and leaves the two
extremes resting on synthetic evidence. That is an honest ceiling for public
data: `sub-low` is barely sung and `above-range` is where our detector is known
to fail, so both would need targeted recording rather than a dataset.

---

## 7. Suggested order, when we act

1. **VocalSet** — biggest gain per unit effort; no resampling decision; supplies
   the sustained material the accuracy metric actually requires.
2. **Owner's own recordings** (already planned) — same-device, same-room control
   against 20 professional voices; also the fastest to obtain.
3. **Dagstuhl ChoirSet** — after the resampling decision in §4 and the consent
   check in §5. Brings the low band and the first trusted annotations.
4. **vocadito** — cheap, device diversity, tracking only.

Re-examine **Annotated-VocalSet** and **MIR-1K** only if someone establishes the
annotation provenance and the licence respectively.

---

## Sources

- [vocadito on Zenodo](https://zenodo.org/records/5578259) — licence confirmed CC BY 4.0 at source
- [vocadito paper (ISMIR 2021 late-breaking)](https://archives.ismir.net/ismir2021/latebreaking/000044.pdf)
- [VocalSet on Zenodo](https://zenodo.org/records/1193957) — CC BY 4.0
- [VocalSet paper (ISMIR 2018)](http://ismir2018.ircam.fr/doc/pdfs/114_Paper.pdf)
- [Dagstuhl ChoirSet on Zenodo](https://zenodo.org/records/3897182) — CC BY 4.0
- [Dagstuhl ChoirSet paper (TISMIR)](https://transactions.ismir.net/articles/10.5334/tismir.48)
- [MDB-stem-synth on Zenodo](https://zenodo.org/records/1481172) — CC BY-NC 4.0
- [Annotated-VocalSet on Zenodo](https://zenodo.org/records/7061507) — CC BY 4.0
- [mirdata dataset quick reference](https://mirdata.readthedocs.io/en/stable/source/quick_reference.html) — useful index, **but its licence column is unreliable**: it lists vocadito as CC BY-NC-SA 4.0 where Zenodo says CC BY 4.0. Always confirm at the dataset's own record.
