# Saigon Golf 3D Club — BRIEF

**Self-authored under explicit creative delegation.** The owner asked to redesign the landing page
with ScrollCraft and said earlier "anh chỉ biết kết quả" (he only wants results). No interview was
held; every answer below is an authored decision unless marked as evidence.

## Evidence (from the project, not invented)
- Real club: 250 Lương Đình Của, Phường Bình Trưng, TP.HCM. Hotline 0902030185. Open 08:00–23:00.
- 10 lines (8 standard + 2 VIP), Foresight GC3. Official price list and 13 packages (docs/PRICING.md).
- Booking is a real form (`/api/public/booking`) that staff confirm. VAT 10%, no service fee.
- Assets owned: logo, one banner render (Foresight screen). **No photography of the venue.** No
  `KIE_AI_API_KEY`, so nothing is generated: the page is typography, SVG and the supplied banner.
- Only real figures may appear (prices, hours, line counts). No invented testimonials or stats.

## The eight topics
1. **Vibe:** a printed golf scorecard, forest green and bone with one amber accent. References: a
   club scorecard and pencil, a Pentagram-style annual report, a yardage book.
2. **Scroll journey:** title page, then "one round in four steps" (the ball flies), then the
   golden hour deal, then the price list and packages, then book a slot, then a quiet colophon.
3. **Energy curve:** quiet title, rising through the round, loudest at the ball landing, relaxed
   during prices, focused at booking, calm at the end.
4. **Feeling, stage by stage / the one moment:** see curve and peak below.
5. **The thing no site does:** the scroll is a golf shot. A trace rail along the bottom draws the
   ball's flight as you scroll; every chapter you pass plants a flag; the rail is also the nav.
6. **Distance from premium-minimal:** editorial and typographic, bone paper and forest ink, hard
   cuts between grounds, no cards, no glow.
7. **One world or distinct scenes:** distinct chapters (printed pages), hard cuts. Not worldflight.
8. **Assets:** logo, banner render, nothing else. No generation.

## Grammar
**Chaptered editorial** (uniqueness.md §2.2). Why the other seven lost: filmic and continuous world
need footage we do not have; live surface and gallery have no product UI or photos; typographic
poster forbids the cards/tables a price list needs; split stage has no two-sided argument; cutlist
is for energy not reference content. This page is mostly reference content (prices, packages,
a form), which is exactly what a printed feature carries well.

## Journey
1 Recognition: a club in the city that plays golf all day, any weather.
2 Turn: what one round feels like, ending with the ball in the hole and GC3 reading it.
3 Reward: the golden hour (08–11, Mon–Fri) is cheap and the food is free.
4 Substance: the whole price list, no surprises (VAT stated).
5 Commitment: book a slot, staff confirm.
6 Resolution: the address and a quiet sign-off.

## Feeling curve
| Act | Feeling | What causes it |
|---|---|---|
| Title page | Calm anticipation | Huge type on bone paper, almost no motion, one sentence |
| I · Một buổi chơi (pin) | Rising immersion, then release | Four lines assemble while the ball arc draws; the PEAK is the drop into the hole |
| II · Giờ vàng (count) | Delight | Three real prices tick down into view |
| III · Bảng giá & gói (pan) | Clarity, trust | A ruled price list, each package as a printed column, lateral travel |
| IV · Đặt chỗ (flow) | Focused anticipation | A quiet form on paper, the next step spelled out |
| Colophon (pin hold) | Resolution | Small type, address, one sentence, the trace rail completed |

## The peak
"The ball you watch fly is the page scrolling, and it drops into the hole just as the numbers
appear." Lives in act I, the largest span (5.2 viewport heights). The title page before it is the
quietest on the page.

## It's the site where…
…scrolling is the swing: you watch your own scroll fly the ball down the fairway into the cup.

## Authored silence
After the peak, a short empty stretch of bone paper (about 0.25 viewport) holds before Act II, so
the landing is felt. It is deliberate, not dead scroll.

## Signature move (bespoke, coded in the page)
**Shot trace rail.** A fixed 44px rail at the bottom edge draws a parabolic flight (SVG path) with a
ball as playhead; `--sc-p` of the page (scroll progress) sets the draw length and ball position.
Each chapter passed plants a flag on the rail that stays; clicking a flag scrolls to that chapter.
By the colophon the rail is the complete record of the round. It does not exist in the engine.
