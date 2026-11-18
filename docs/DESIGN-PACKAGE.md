# Design Package: Raja Shahid Jewellers homepage

Owner: Saad. Method: the 10k-websites skill (design and engineering standards), applied inside the existing Next.js site. Status: **awaiting Saad's approval**. Nothing below is built until it is approved.

Deviations from the skill, said out loud:

- **No AI video hero.** The account has 0 Higgsfield credits, so the hero stays the canvas particle scene (Golden Assembly 2.0). Every other standard of the skill applies.
- **No rebuild.** The skill builds a single `index.html`; this site is the team's Next.js repo, so the standards are applied here instead.
- **Two actions, not one.** Saad and the team want both a showroom visit and a custom order. WhatsApp enquiries belong to the AI team's chatbot work and are not built here.
- **Mobile plays the assembly once** (lightweight canvas) instead of showing only a still. Reduced motion still gets the finished still frame.
- **Dark with a gold accent is a banned default in the skill.** It is kept because it is this subject's own material world (gold on black velvet, gold streaked on a black touchstone), with tones sampled from the hero piece and a signature element of its own (below).

## 1. Brand premise

**Kasauti, the touchstone.** For generations, gold in the sarafa bazaar has been tested by drawing it across a black stone: the streak it leaves shows what it is made of. The whole homepage teaches that one idea: *gold you can see the truth of*. The hero gathers loose gold into a piece; the touchstone section lets the visitor draw the streak themselves; every section ends with something real to check or choose. The site never claims a heritage date, a workshop technique or a shop policy that the owner has not confirmed.

Feeling (Saad's choice): **futuristic and magical**: light, gold dust and depth in every section, at whisper level outside the hero.

## 2. Palette tokens (sampled from the hero piece and the velvet it rests on)

```css
--canvas: #0e0b09;       /* kohl: page background, never pure black */
--panel: #1a1310;        /* raised surfaces, drawer, cards */
--velvet: #3a1219;       /* oxblood glow behind pieces */
--accent: #c9a253;       /* antique gold: actions, focus, one emphasis per section */
--accent-hover: #e9d6a8; /* champagne */
--accent-muted: rgb(201 162 83 / 22%); /* lines, particles, borders */
--text-primary: #f4ecdf; /* ivory */
--text-secondary: #b9b2a7;
```

## 3. Type

- Display: **Cormorant Garamond** 400/500 (already in the design system).
- Body: **Manrope** 400/500 (already in the design system).
- Stamps: **IBM Plex Mono** 500, only for hallmark numerals and design codes (916, 875, RSJ-D001), because those are stamped marks in the jewellery world. Nowhere else.

## 4. Hero band map (Golden Assembly 2.0 plus captions)

**Decision A (approved by Saad, 19 Nov 2026): the hero scrolls about 2,000px** (the team brief said 500–800px; the skill's standard would be about 4,000px). At 2,000px five separate bands cannot each hold a readable plateau, so, as the skill prescribes, the two short lines share one band and arrive one after the other. Ranges are progress over the 2,000px; plateau is the fully readable stretch.

| Band | Range | Plateau | What the scene is doing | Copy (verbatim) | Entrance |
|---|---|---|---|---|---|
| 1 | 0.00–0.18, settled on load | 0–280px, plus reading at rest | gold river drifting on velvet, starting to gather | "Crafted to be remembered." / "Scroll, and loose gold gathers into the Mehr Crescent Collar, one of the sample designs in our Design Vault." | word rise on load, then held |
| 2 | 0.18–0.60 | line one 640px, line two 420px | dust spirals into the collar, then a band of light uncovers the photograph | "Every grain finds its place." then "Then the light tells the truth." | line one scatters in like the dust; line two goes from blur to sharp as the light passes |
| 3 | 0.62–0.89 | about 390px | piece at centre stage, notes drawn | notes and facts (already built, from the image and the catalogue) | leaders draw out |
| 4 | 0.88–1.00, holds to the end | 120px, then the frame scrolls away with the line still on screen | piece settles, collections rise | "Where would you like to begin?" | word-by-word rise, tiles after |

Flick test (wheel steps of 120, 240 and 360px): no band may be skipped at 360px. At 2,000px the readable run is about five normal flicks for line one and three to four for the others, which is the trade Saad accepted.

**Decision B (approved by Saad): dark velvet with some ivory sections.** The hero and selected sections stay dark velvet; others stay ivory as they are now (today: hero, Bridal and the gold finale are dark; the Vault and AURIA are ivory). Each section's tone is fixed when that section is built, and neighbours never share both tone and layout.

Still frame (phones with reduced motion, no JS): headline, intro, both actions, piece with its facts, collection tiles.

## 5. Below the hero, in order

No two neighbours share a layout. Each has one living element at whisper level.

1. **Dual Portal: Women | Men | Made to order.** Three reference photographs side by side; hovering one widens it to 70% with a soft, unbouncy ease; a gold light follows the cursor. Swipe rail on phones. Living element: a slow light drift along the portal edges. Label on photos: "Reference photography. Not our jewellery."
2. **The Touchstone (the one interactive moment).** A black stone; the visitor presses and drags across it and a gold streak appears; releasing early lets the streak fade back, never snapping. When the streak is complete, four lines light up in turn, in buyers' own words:
   - "See it weighed, in grams, in front of you."
   - "Read the stamp: 916 is 22K, 875 is 21K, 750 is 18K."
   - "Ask for the making charge on its own line."
   - "Ask what you get back if you ever sell or exchange it."
   Closing line: "Bring these four questions to any jeweller, including us." Beside it, the gold rate panel (24K, 22K, 21K, 18K, tola and gram), labelled illustrative until a live rate source is approved. Reduced motion shows the streak drawn and all four lines lit.
3. **Signature pieces.** A pinned horizontal rail of the published sample designs: cursor tilt, a specular highlight that follows the cursor across the gold, title underline on hover. Selecting a piece opens the detail drawer (step 4 of the plan).
4. **Bridal.** Stacked sticky images and a line-by-line headline. Copy: "A promise, beautifully kept." / "Bridal sets are made to order. Your timeline is agreed with you before work begins."
5. **The Vault in 3D.** The sample designs on a ring you can drag, with Ring, Helix and Sphere layouts. Each opens in the Design Vault.
6. **AURIA band.** Compact; content and integration stay with the AI team.
7. **Visit or commission.** Two actions: "Plan a showroom visit" and "Request a custom design". The large wordmark reveals behind them. Footer note: "Demo website. Designs are sample concepts; model photographs are stock reference."

Copy marked for the owner: any line that states a shop practice (itemised bills, hallmarking, buyback terms, timelines) is held back until Raja Shahid Jewellers confirms it.

## 6. Whole-page environment and vector layer

- One fixed background layer behind the dark sections: velvet grain and a few slow gold motes on a 60-second cycle. Ivory sections cover it (decision B).
- **Signature element: the gold streak.** The hero's dust river, the section dividers (thin streaks that draw themselves on scroll) and the touchstone are the same motif. If it were removed, the page would lose its idea.
- All of it pauses off screen and on hidden tabs, and shows its finished state under reduced motion.

## 7. Engineering list

Frame-rate independent smoothing (done), style writes only when a value changes, bands paced in scroll distance with the flick test, legibility for text over particles (scrim plus text-shadow token, contrast checked on the worst frame), live motion gates for phone, rotation and reduced motion in both directions, complete without the hero image (done), `overflow-x: clip` on html and body, entrance delays retired after they play, transform and opacity only, `body.paused` on hidden tabs.

## 8. Build order (one step at a time, each tested and approved)

1. Hero captions, legibility and the flick test.
2. Dual Portal.
3. The Touchstone with the gold rate panel.
4. Signature pieces rail and the detail drawer.
5. Bridal, the 3D Vault, AURIA band, Visit or commission, footer.
6. The skill's 12-point self-test and the copy gate, then the pull request.

## 9. Copy gate

Every viewer-facing line above ships verbatim. Before anyone sees a build: zero em dashes, zero stock words (leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions), and a sweep for AI tells. Deliberate devices in this package stay.
