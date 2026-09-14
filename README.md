# Spotted · The family road book

A simple family car-spotting game for the Tesla browser, tablets and phones.
Your usual players and brands appear ready to start; editing is optional. Tap a player's logo when they spot one.
**Any model of your brand, one point.**

[Play Spotted](https://zestybytes.github.io/cars/)

## Playing

- Choose names, colours and brands from the searchable 50-brand library.
- Tap the logo/score area to add a point. Players choose a two-note sound in their settings, with a preview button;
  the speaker icon mutes them. There are no scoring pop-ups. The score briefly grows on a hit, and the tap hint disappears after three spots. Text selection, image dragging and hold menus are disabled on the playing surface; name fields remain editable.
- Each player's separate −1 control removes their latest sighting.
- Finish trip goes straight to the results, without confirmation. Reopen trip
  restores the latest trip and reverses its win/best awards so mistakes can be
  corrected. Reopening is available until the next trip or a roster change.
- Play again keeps the brands; Swap brands & play swaps or rotates them.
- The results show final player scores once, with the full leaderboard behind Overall and Log.
- Personal bests appear as compact records. First-ever scores are not announced.
- Tap the Spotted logo on the player setup screen to switch day/night mode.
  The game header contains only the trip number, time, sound and finish controls.

Portrait uses compact, equal player rows, including for three players. Landscape
places players alongside each other; short windows put artwork beside the score.
Up to six players are supported, with scrolling when necessary.

## Saved records

Scores save in localStorage under the original `carspotter.v1` key. Reloading
resumes the active trip. Existing scores, wins, records and history are preserved.
Legacy bonus/weighted scores retain their original values and undo accounting,
but all new sightings earn one point. Modes, bonus cars, rules and team targets
are no longer part of the interface.

Records are per browser and device, with no cloud sync. Clearing site data removes
them. The last 500 trips are retained, with lifetime totals and personal bests.
Storage errors are shown explicitly. The full app and all brand logos are cached for
offline use after the first successful online load. Screen wake lock and persistent
storage are requested where supported.

## Brand logos

50 brands, from Abarth to Volvo, including MINI, BMW, Tesla, Fiat, Ford, Toyota,
Audi, Mercedes-Benz, Volkswagen and many more. Any model, colour or age counts.
Search ignores accents (for example, Skoda finds Škoda).

Logos are bundled in `assets/brands/` for offline play. See
[logo sources](assets/brands/SOURCES.md) for attribution. Earlier car artwork remains
in `assets/cars/` but is no longer shown or cached.

Saved model choices become their brands automatically (for example, Model Y and
Model 3 become Tesla). Scores and recovery data are retained; where two model
personal bests become one brand, the higher record is kept.

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
