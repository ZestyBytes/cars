# Spotted · The family road book

A simple family car-spotting game for the Tesla browser, tablets and phones.
Your usual players and cars appear ready to start; editing is optional. Tap a player's poster when they spot one.
**One car, one point.**

[Play Spotted](https://zestybytes.github.io/cars/)

## Playing

- Choose names and cars from the searchable ten-car library. Player colours are
  assigned automatically, so no two players share one.
- Tap the poster/score area to add a point. Players choose a two-note sound in their settings, with a preview button;
  the speaker icon mutes them. There are no scoring pop-ups. The score briefly grows on a hit, and the tap hint disappears after three spots. Text selection, image dragging and hold menus are disabled on the playing surface; name fields remain editable.
- Each player's separate −1 control removes their latest sighting.
- Finish sits in the game footer beside Leaderboard, marked with a chequered
  flag, and goes straight to the results without confirmation.
- Play again keeps the same players and cars.
- The results show final player scores once, with the full leaderboard behind Overall and Log.
- Personal bests appear as starred records, including a player's first one, and a
  player beating their own record sees "★ Best ever!" on their card during the trip.
- The winner's confetti comes with a short fanfare unless sound is muted.
- Tap the Spotted logo on the player setup screen to switch day/night mode.
  The game header contains only the trip number, time and the sound control.

Portrait uses compact, equal player rows, including for three players. Landscape
places players alongside each other; short windows put artwork beside the score.
Up to six players are supported, with scrolling when necessary. Add player sits both
in the ready line-up and in the editor; either opens the editor on the new card.

## Saved records

Scores save in localStorage under the original `carspotter.v1` key. Reloading
resumes the active trip. Existing scores, wins, records and history are preserved.
Legacy bonus/weighted scores retain their original values and undo accounting,
but all new sightings earn one point. Modes, bonus cars, rules and team targets
are no longer part of the interface.

Records are per browser and device, with no cloud sync. Clearing site data removes
them. The last 500 trips are retained, with lifetime totals and personal bests.
Storage errors are shown explicitly. The full app and all posters are cached for
offline use after the first successful online load. Screen wake lock and persistent
storage are requested where supported.

## Car artwork

Tesla Model Y, Honda Jazz, Ford Fiesta, Vauxhall Corsa, Volkswagen Golf, MINI Hatch,
Nissan Qashqai, Kia Sportage, Tesla Model 3 and Fiat 500.

Original Model Y and Jazz posters are preserved. Eight additional posters were
created with built-in image generation using those as style references.
Assets: `assets/cars/`. Exact prompts: [docs/car-art-prompts.json](docs/car-art-prompts.json).

## Development

Static HTML, CSS and JavaScript: no build step or runtime dependencies.

```sh
python3 -m http.server 8000
node --test tests/*.test.cjs
```

`game.js` owns saved-state accounting; `app.js` owns the interface; `cars.js` holds
the collection; `sw.js` caches the offline shell. Tests include legacy migration,
undo, recovery, records, mode simplification and offline handling. Historical mode
accounting remains in the model for compatibility with saved records.

Optional browser checks: start the local server and run `node tests/browser-check.cjs` with Playwright and its Chromium/WebKit browsers installed. These cover two and three players at portrait, landscape and Tesla-sized viewports, sound settings, scoring/correction and result tabs.

Pushing main publishes to GitHub Pages via the existing workflow.
