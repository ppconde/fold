# Spike: an honest inside reverse fold (the crane's neck)

2026-10-13. Question: for the crane's neck step (lesson step 16, `s.fold('neck', …)` in models/src/crane.ts), which approach gives an honest inside reverse fold, and at what cost? (A) a rigid crease-angle path that opens the layers, or (B) a build-time bending solver that bakes per-vertex keyframes.

**Short answer.** A is impossible without unfolding the body back past the square base. B is the only route, but the solver needs more than the prototype had. The simulation is cheap (seconds to a minute per step). The hard part is what moves the paper: every simple drive tried either locks, crumples or tears. The real fix is a solver that finds the whole step's motion from its two end poses, with real contact. Run a second, time-boxed spike on that before committing to the four-PR plan.

All code was throwaway and is not committed. It sits in the spike worktree, `../fold-reverse-spike/spike/` (`vertex.ts`, `openflat.ts`, `history.ts`, `bend.ts`, `view.html`, `shoot.mjs`, `app-shots.mjs`), with images in `spike/out/`.

## The step in numbers

Step 16 moves six creases. The fold line has one crease per layer: 44 (faces 1|2) and 46 (5|6) go 0 → +180, and 51 (25|34) and 52 (27|35) go 0 → −180. The leg's spine 60 (34|35) and its tip 18 (22|23) go +180 → −180, which is the same pose relabelled. The body's spine 47 (25|27) stays at 180.

The leg has four layers, 2, 34, 35 and 5 (bottom to top: 5, 35, 34, 2). Seen end-on it is a W: 2|34 is joined at one side edge, 34|35 at the spine, and 35|5 at the other side edge. It lands between the body's inner layers 27 and 25, in the order 35, 5, 2, 34.

The fold line meets the leg's folded edges at three degree-4 vertices:
- V0 (0.684, 0.316): creases 47, 52, 60 and 51, with sector angles 80.2° / 80.2° / 99.8° / 99.8°;
- V1 (0.583, 0.173): creases 43, 44, 51 and 63;
- V2 (0.827, 0.417): creases 45, 46, 52 and 61.

Today's checks on the shipped swing-and-tuck: the step tears by up to 0.026 (budget 0.06), and `crossings` reports nothing because the tuck only relabels the layers in its last tenth. Frames of today's motion are in `spike/out/app-today.png`. They also show the mirror noted in carry-forward: "the left flap" is the one drawn on the right.

## A: a rigid path that opens the layers

**The lock (spike/vertex.ts).** A degree-4 vertex has two one-parameter branches of motion, and they meet only where all four creases lie flat. At V0, the folded-straight state (47 = 60 = 180°, 51 = 52 = 0) and the reverse-folded state (all four at ±180°) sit on different branches. So any rigid path must pass through 47 = 60 = 51 = 52 = 0, with the body's spine opened flat.

I walked the ring of faces around V0 and searched every pair of spine angles (47, 60) at 1° steps, for each fold-line angle θ (51 = 52 = θ):

| θ | best closing error, any (47, 60) | at (47, 60) | best closing error, 47 held ≥ 150° |
|---|---|---|---|
| −1° | ~0 (grid) | (−5, −5) | 0.046 |
| −10° | ~0 | (−2, 1) | 0.454 |
| −45° | ~0 | (−8, 8) | 1.77 |
| −90° | ~0 | (−20, 20) | 2.46 |
| −170° | ~0 | (−127, 127) | — |

The ring closes only with the body spine near 0, that is, fully open. With the body kept closed, it can't close at all, and the residual grows with the fold. V1 and V2 lock the same way, so at the moment the fold line leaves 0, all three rings must lie flat at once: faces 1, 2, 25, 27, 34, 35, 5 and 6 in one plane.

**How far that is (spike/history.ts, spike/openflat.ts).** Crease 47 has been at 180° since step 7, the collapse to the square base. No later state has it at 0. I asked the path solver's projection (`project` in models/solve.ts) for the nearest joined pose with the three rings flat:
- it moved more than 40 creases, wings included, and still tore by **0.725** (budget 0.06);
- the path into that pose crosses faces from 2.5% of the step on, and from 47.5% on dozens of pairs pass through each other (e.g. at 50%: 2×7, 8×34, 14×27, 16×20, …).

**Verdict: no.** The only rigid route is "unfold the body to before the square base and refold". That is a different lesson, not an animation of a reverse fold.

## B: a build-time bending solver

**Prototype (spike/bend.ts).** It runs offline through Vite like `pnpm models`, on step 16 only:
- **Mesh:** the leg and the four body faces it hinges on (1, 25, 27, 6) are fanned and split in four 2–3 times, giving 348–1308 triangles and 164–648 free vertices. Every other face is a still obstacle, lerped between the engine's two end poses (only its layer lift changes).
- **Constraints:** quasi-static position-based projection per frame:
  - hard stretch on every mesh edge;
  - a signed-dihedral constraint on every hinge, using the engine's angle convention. Its gradient is checked against finite differences (1e-10), and its sign is calibrated on every crease folded flat at the start (72 agree, 0 disagree);
  - vertex-triangle contact that remembers which side each vertex started the frame on, with thickness 0.0012 (layer gap 0.002).
- **Landing:** the last tenth blends onto the engine's end pose, so the next step joins.

**Cost.** 120 frames × 40 iterations on the coarse mesh takes 1–2 s. 240 × 30 on the fine mesh takes 35 s, and 240 × 40 takes 68 s, in Node, single-threaded, with a naive spatial hash. Compute isn't the obstacle.

**What moves the paper is the obstacle.** Three drives:

1. **Crease angles only.** The fold line ramps to its end angle, and the spine and tip go 180° → 0 → −180°.
   - With stiff faces, the motion locks. 51 drifts the wrong way (−28° against a +180° target) and the spine never opens: the degree-4 lock again, now as energy.
   - With soft faces, every crease reaches its target and stretch stays at 3–8%. But the flap never moves (end pose off by 0.83): interior bends fold the paper back next to the fold line.
2. **Each half turned as a piece.** The halves {2, 34, 3, 22} and {5, 35, 4, 23} turn about the fold line in opposite directions, and spine points take the average. The guide tears itself apart: points on the spine sit on the fold line while their neighbours swing out a full turn (stretch up to 1160% when held hard; 50–280% as a weak hint).
3. **Push the spine in** (a folder's hand). Spine and tip points turn in the paper's plane about V0 onto their end places (−160°); everything else follows. This is the closest attempt: the flap does rise into the neck. But it crumples and tears on the way. Stretch is 20% even with contact off, and 50–650% with contact on. Frames are in `spike/out/b-push-side.png` and `b-push-front.png`.

Why drive 3 can't work: with the spine swept in the plane about a fixed V0, the far half needs its fold-line vertex V2 0.614 from the tip, against 0.451 of paper between them. Even standing V2 straight up only brings that to 0.48. Mid-move, the body's layers have to open wide, far more than "parting slightly". Real paper does this, and no fixed schedule of a few points describes it.

Smaller lessons for the real solver:
- Fanning long thin faces makes sliver triangles along the spine, whose dihedral gradients fling vertices. The mesh needs a proper conforming triangulation of each face.
- The direction each fold-line crease turns can't be read off its ±180° label (one pose). My first reading of the end stack gave the wrong way round; the pushed paper chose the engine's labels' direction. A solver must not be told directions it can work out for itself.
- Vertex-triangle contact alone lets edges slip through 0.002 stacks. It needs edge-edge contact and continuous collision detection (CCD) as well.

## Follow-up: tear the paper instead (spike/tear.ts)

I cut the flap's spine (creases 60 and 18) for the one step. The halves {2, 34, 3, 22} and {5, 35, 4, 23} each turn rigidly about the fold line, then rejoin in the last tenth. Both directions:

| halves turn | widest tear | pairs passing through each other |
|---|---|---|
| apart (A up, B down) | 0.881 at 45% | 21, e.g. 2×27, 2×6, 6×34 (38–85%) |
| toward each other (A down, B up) | 0.881 at 45% | 27, e.g. 2×5, 5×34, 33×35 from 3% on |

On rigid faces the tear can't stay small. It opens along the whole spine, in proportion to the distance from the fold line, so mid-step the leg splits into two leaves standing out either side (frames: `spike/out/tear-outward-side.png`, `tear-inward-side.png`). It doesn't read as a reverse fold, it is 15× the seam budget, and the leaves still pass through the body. Today's swing tears by 0.026 and keeps the flap whole. A small tear only becomes possible with extra hinges near the fold line, and that is the transient-hinge idea below.

## Follow-up: open the body, as hands do (spike/bend.ts, `EXPAND`)

**Rigid paper.** It has to open all the way. At V0, V1 and V2 every crease must reach 0 at once, and those creases were made at steps 7 (47, 48: the square base), 8/11 (45, 61) and 13/15 (43, 63). Rigidly, "open the body" means unfolding that side back to about the square base, folding the neck as a plain fold, and collapsing again.

**Bending paper.** I added a drive to the solver that opens the body's spine (47, 48) and the side edges (43, 45, 61, 63) by E degrees mid-step and closes them again, while the spine is pushed in.

| what's free | contact | E | body spine 47 at 50% | worst stretch |
|---|---|---|---|---|
| leg and body faces | on | 60–170° | stays 143–150° | 67–160% |
| leg and body faces | off | 120° | stays 146° | 76% |
| everything but the held face | off | 90° | opens to 93° | 31% |
| everything but the held face | on | 90° | stays 138° | 94% (325% on the fine mesh) |

The body won't open on its own: it is joined through the centre to the wings, and the wings' layers lie over and under it. Opening it means moving the whole bird, and with contact on the solver can't coordinate that. The fine run takes 113 s (3009 triangles). Frames are in `spike/out/expand-side.png`: the pocket does show, dark at 86%, but the paper crumples. So hands-like opening is the right picture of the motion, and it is exactly what the path optimizer in the recommendation has to find for itself.

## Recommendation

1. **Drop A.** For the neck, and for any reverse fold in a closed body, it is proven impossible short of unfolding.
2. **Keep B as the direction, but don't open the four PRs yet.** The missing piece is a drive that needs no authoring: a solver that takes only the two end poses and finds the whole step at once. That means minimizing stretch, bending and motion between frames, with a contact barrier between successive frames (IPC-style, with CCD), starting from today's swing-and-tuck as the initial guess. That is a research-sized piece; the prototype's integrator is not it.
3. **Next, a second spike, time-boxed to 2–3 days, on the neck only:**
   - (half a day first) **transient hinges.** Rigid paper with a few extra creases that are flat at both ends of the step, added with `mark()` through V0, V1 and V2, unlocks the degree-4 vertices: degree-6 vertices have spare freedom. If a collision-aware keyframe search (`crossings` as a constraint in `solvePaths`) finds a joined, non-crossing path, the engine stays rigid. That would need no baked format, no mesh, and nothing new on phones; the hinges would need a hidden-crease assignment so they don't draw.
   - (otherwise) **the path optimizer** described in point 2, on a properly triangulated strip.
   - Pass: worst stretch < 1%, no crossings at 40 samples, end pose within one layer gap before landing, and a frame sheet that reads as a reverse fold.
4. **If the spike passes with the optimizer, the PR shape holds, with these sizes:**
   - **Engine, baked motion in `.fold`** (~700–900 lines with tests): a per-step mesh and quantised vertex frames, loader, player geometry from frames, checks (stretch, crossings on the baked mesh), homepage unfold (blend or skip baked steps), thumbnail (end pose only). Plan for size: 700 vertices × 3 × 30 frames is about 400 KB of raw JSON per step. Quantise (16-bit deltas from the rigid pose) to roughly 60–120 KB. The crane needs three such steps.
   - **Engine, solver with `fold(…, { bend: true })`** (~800–1200 lines): triangulation, the path optimizer with contact, a deterministic seed so `pnpm models` stays byte-stable, and a time budget per step (aim for under 2 minutes).
   - **Crane** (~200 lines): neck, tail and head; the swing-and-tuck stand-in and the mirror (see carry-forward) go.
   - **Snail**, after the crane.

   If transient hinges pass instead, the first two PRs shrink to one engine PR (~300–500 lines: hidden creases plus a collision term in `solvePaths`). That same collision term also fixes the homepage unfold's crossings noted in carry-forward.
