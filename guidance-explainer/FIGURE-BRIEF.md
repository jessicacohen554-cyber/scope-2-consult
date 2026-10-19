# Phone figure brief

Goal: every figure fits a phone screen without sideways scrolling, with labels you can
read. Desktop figures stay as they are. Each figure gets a second, phone-specific
drawing that is shown instead of the desktop one below 640 px.

Rules
1. Keep the existing `<svg>` and add `class="fig-d"` to it. Add a second `<svg
   class="fig-m" viewBox="0 0 360 H" role="img" aria-label="(same claim)">` right after
   it, inside the same `<figure>` / `.fig-frame`. guidance.css shows only one of them.
2. The phone drawing is a RE-LAYOUT, not a shrink: stack what was side by side,
   shorten labels, drop decorative text, keep every element that a step, caption,
   toggle or stepper refers to. Drawn type must be >= 13px for labels (`class="t"` is
   12px: use `font-size="13"`/`"14"` or the `.t-lg` class) and >= 12px for secondary
   text; at 360 units wide the renderer scale on a phone is about 1.0, so drawn size
   is effective size. Minimum effective size the checker accepts is 11 px.
3. Height: scrolly figures (inside `.scrolly-figure`) must be <= 300 units tall
   (viewBox 360 x <=300) because the phone pins them in a 46vh box above the steps.
   Static figures may be up to 360 x 520. Stepper figures (frames) count as static
   but keep every frame inside the same box.
4. Ids: every `id` inside the phone drawing gets the suffix `-m` (markers, gradients,
   clip paths) and references use `url(#x-m)`. Keep `data-step`, `data-show`,
   `data-frame`, `data-frame-text`, `data-mode-show` attributes identical in meaning
   so the shared behaviours drive both drawings. If page JS or CSS targets an id
   inside the desktop svg, extend it to the `-m` id too (or switch to a class).
5. Remove any earlier sideways-scroll hack: `.fig-scroll` wrappers and page CSS that
   sets `min-width` on figure svgs or scrolls figures. Tables may keep `.scroll-x`.
6. Colours and classes: only the svg classes in guidance.css (`.node`, `.edge`,
   `.t`, `.fill-*`, `.soft-*`) and CSS variables. No literal hex.
7. Content: the phone drawing must say the same thing as the desktop one. Do not add
   facts; abbreviate labels only where the meaning is unchanged (e.g. "Statement 3"
   -> "Stmt 3" is fine; dropping a GAP marker is not).
8. Check with:
   node /tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/figcheck.js /home/user/scope-2-consult/guidance-explainer <port> <pages...>
   It renders at 390 px, screenshots every figure into
   /tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/figshots/<page>-figN.png,
   and prints minText (effective px), height, OVERFLOW and SMALL-TEXT flags. Every
   figure on your pages must show `fig-m`, minText >= 11, no OVERFLOW, and a scrolly
   figure height <= 390 px. Look at each screenshot (Read tool) for overlaps and
   clipped labels before you report. Also re-run the desktop/overflow checker:
   node /tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/shoot.js /home/user/scope-2-consult/guidance-explainer <pages...>
   (it uses port 8765; if busy copy it and change the port).
9. Do not commit. Report: figures converted, any label you shortened, anything you
   could not fit.
