# Spotted · The family road book

A car-spotting game for family journeys, built for full-width and half-width
Tesla browser windows, tablets and phones. Pick a car, tap when you spot one,
and collect journey wins and an overall record. A passenger can keep score.

Static HTML, CSS and JavaScript. No build step, account, runtime dependencies or
external font requests. Hosted on [GitHub Pages](https://zestybytes.github.io/cars/).

## Play

1. Choose names, player colours and cars. **Change car** opens a searchable,
   filterable ten-car poster library. Any colour or generation of the named model
   counts; illustrations show examples, not a restriction to one year.
2. Pick a mode:
   - **Classic:** one point per car.
   - **Rarity:** set 1–5 points per model before starting. Suggested values are
     adjustable house rules, not measured local rarity. Values are fixed during a
     journey. Players choosing the same model share its value.
   - **Quick round:** first to 5, 10 or 20 points. The journey ends automatically
     at or above the target; a bonus can take you past it.
3. Optionally set a **team target** of 10, 20 or 50 sightings. It runs alongside
   the individual competition. A **shared bonus** randomly selects an unassigned
   car for the journey; each new sighting can be claimed by one player for 3 points.
   Count each physical car once and agree who spotted it first.
4. Tap a player's large **Spotted!** area. Their position never changes. The
   separate **Undo** removes their latest sighting, including a bonus. The short
   notification can undo that exact sighting instead.
5. **Finish** records the result, awards wins (both players on a positive tie),
   celebrates personal car records and the team target. Zero-point journeys do
   not award wins. **Play again** keeps the players, cars and rules; **Swap cars &
   play** swaps two cars or rotates assignments for larger groups.
6. **Reopen journey** reverses the latest win/best awards and restores its undo
   history. Correct a sighting and finish again. Time spent on the results screen
   is excluded. Recovery is offered for new-format journeys until another journey
   starts or the player names/cars/roster change.

## Layout and controls

- Below 1,200 CSS pixels, the player cards take the full board width. The bottom
  bar shows the leader and team progress, with standings and bonus claims in dialogs.
- Full width adds a supporting rail with lead, team challenge, bonus and overall
  points. Full-width results show overall standings alongside the journey result.
- Two players stay side by side, including in a half-screen window. Short landscape windows place the poster beside the score. Up to six
  players are supported, using additional scrollable rows when necessary.
- Tap the Spotted logo in any header for night mode; the speaker icon toggles sound. Each player has a distinct two-note chime. Sound is optional
  and its state is saved. Reduced-motion preferences suppress animation/confetti.
- Scoring uses normal buttons (touch, Enter and Space); correction controls are
  separate. Dialogs trap focus, close with Escape and return focus to their opener.

## Saved scores and offline use

The existing `carspotter.v1` localStorage key is retained. Old players, scores,
journey wins, history and active journeys migrate automatically. Original totals
remain **cars spotted**. **Points** are separate, starting from the old totals;
rarity and bonus scoring can subsequently increase points faster than sightings.
Personal bests count sightings of the assigned car, excluding bonus cars. The interface only shows a separate car count when it differs from points; zero bests and first records below five sightings are not highlighted.

Every change saves locally. Reloading resumes an active journey or the latest
result. Completed records keep the latest 500 journeys; all-time counts, points,
wins and personal bests continue beyond that. Only the latest journey keeps the
additional undo/recovery data. Storage errors display a persistent message.
Editing the same record in another tab requires reloading before continuing.

Records are per browser and device, with no cloud sync. Clearing browser site
data removes them. The app requests persistent storage and a screen wake lock
where supported. Neither browser permission is required to play.

The service worker atomically caches the complete shell and all ten posters.
After an initial successful online load they work offline, including unseen
library entries. Cached assets load immediately; navigations check online for
updates and fall back to the cached shell. Missing images never receive HTML.
The menu shows whether offline assets are ready. Refresh after a deployment to
load the new interface; in-progress scores remain saved.

## Car collection

Tesla Model Y, Honda Jazz, Ford Fiesta, Vauxhall Corsa, Volkswagen Golf, MINI Hatch,
Nissan Qashqai, Kia Sportage, Tesla Model 3 and Fiat 500.

The selection combines your original pair with familiar English-road models.
The Fiesta, Corsa, Golf, MINI and Qashqai also appear prominently in
[SMMT's 2025 UK used-car report](https://www.smmt.co.uk/evs-power-up-used-car-market-in-three-year-growth-run/).
This is context for the collection, not a claim about spotting frequency on a
particular route.

Original Model Y and Jazz artwork is preserved. Eight new posters were created
with the built-in image-generation tool using those illustrations as style
references, then resized and encoded as WebP. All artwork is shown whole without
cropping. The exact prompt set is in [docs/car-art-prompts.json](docs/car-art-prompts.json),
and final assets are in `assets/cars/`.

## Development and publishing

```sh
python3 -m http.server 8000
# Open http://localhost:8000
node --test tests/*.test.cjs
```

Tests cover legacy migration, scoring and exact undo, persisted rarity rules,
bonus claims, ties, repeat finishes, recovery, rematches, personal bests, quick
rounds, archive-limit recovery, catalog/cache coverage and offline request handling.
There is no compilation/build step. The existing GitHub Actions workflow publishes
`main` to `gh-pages` after a push.

| File | Responsibility |
| --- | --- |
| `game.js` | Saved-game model and v1 migration |
| `app.js` | Interface, controls, sound, results and storage |
| `cars.js` | Car library, spotting hints and default point values |
| `styles.css` | Responsive paper/poster theme and night mode |
| `index.html` | Setup, game, results and shared dialogs |
| `sw.js` | Versioned offline shell and poster cache |
| `tests/` | Dependency-free model and offline regression checks |
