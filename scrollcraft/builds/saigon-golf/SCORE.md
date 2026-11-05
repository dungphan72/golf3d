# Saigon Golf 3D Club — score

Grammar: chaptered editorial. Ground: forest ink on bone paper, one amber accent (two-stop on light
vs dark grounds). Type: Archivo display + Be Vietnam Pro text (Vietnamese diacritics verified).

| Beat | Device | Why this one |
|---|---|---|
| Title page | `in` (flow reveal) | Type on paper, no media above the fold; quiet before the peak |
| I · Một buổi chơi | `pin` + CSS driven by `--sc-p` (arc, ball) | The argument is a shot; scroll is the swing. PEAK, 5.2 vh |
| silence | none | Authored 28svh of bone so the landing is felt |
| II · Giờ vàng | `reveal` (wipe) + `count` | Real prices appear as a change of state, on the amber region |
| III · Bảng giá & gói | `pan` | Range, not hierarchy: price columns travel sideways |
| IV · Đặt chỗ | `flow` + `in` | The only act that reads like a document; a form needs calm |
| Colophon | `pin` hold ("0 1 0 0") | Resolves; ground exists, CTA is running text |

Families used: in, pin, reveal, count, pan (5). Never the same family twice in a row. Zero scrub
acts (no footage). Signature move: the shot trace rail (`app/ui/ScrollCraftMount.tsx`).

## Verification (scripts/shoot.mjs against the built Worker, 3 modes)
- desktop 1440x900, mobile 390x844, reduced motion: no dead scroll, every cue clears 4.5:1.
- First run found two defects, both fixed: a 1.53:1 label on phone (now a solid plate) and the
  heading cue overlapping step one (heading is now static).
- Not covered: a real phone (video decoder is irrelevant here, but touch scrolling and Safari's
  clip-path/`min()` support were not tested), no photography, no generated assets.
