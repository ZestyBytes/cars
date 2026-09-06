# Car Spotter 🚗

A road-trip spotting game for two (or more). Everyone picks a car to look for — a
Tesla, a Honda Jazz, a tractor — and taps their sheet every time they see one. End the
journey and a stamped trophy says who won.

Styled as a road book in the same system as the [Noted](https://github.com/ZestyBytes/nota)
archive: pale sage paper, Space Mono and Spectral, and every spotter mounted on their
own specimen sheet with mounting tape, a pinned name tag and an accession number.
Light by default, with a dark setting in the masthead for night drives.

Static site: no build step, no dependencies, no network needed after first load.

## Playing

1. **Setup** — each spotter gets a name, the car they're looking for, an ink colour and
   a silhouette (the silhouette auto-picks itself from what you type, or tap the tile to
   override).
2. **Begin journey** — each spotter's sheet is one big button. Tap anywhere on it to
   score. The `−` on the sheet undoes a mis-tap, as does `↶` in the top bar.
3. **End journey** — the trophy stamp strikes, confetti falls, and the trip leaderboard
   appears. Trip scores reset for the next journey; all-time totals and journeys-won keep running.
4. **All-time / Log** — the results screen has three tabs: this journey, all-time
   standings, and the log of every journey ever finished (date, winner and each
   spotter's tally).
5. **Reset all** — erases every score, win and recorded journey. The spotters stay.

## Where the scores live

Scores save as you tap, so a reload, a locked phone or a dropped signal doesn't lose
the game — an in-progress journey resumes where it left off. Finished journeys go into
the log, and the all-time totals and journeys-won keep running across them.

That record lives in the browser's own storage, which means it is **per browser and per
device**: the phone and the car's browser keep separate archives, and clearing site data
wipes it. Two things guard against that:

- The app asks the browser to mark its storage persistent, so it isn't evicted to free
  space. Adding the app to the home screen makes browsers far more likely to grant this.
- **Export** on the setup screen saves the whole archive — spotters, totals, journey log
  — as a dated `.json` file, and **Import** loads one back. That is also how you move the
  archive from the phone to the car, or restore it after a reset.

If we later want one shared archive that syncs between devices by itself, that needs a
backend (Supabase, the way `nota` does it) rather than browser storage.

## Running it

Any static host works. Locally:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Or push to GitHub Pages (Settings → Pages → deploy from branch) and open that URL in
the car.

## Notes on the car browser

The layout is landscape-first with large targets, so it works on the Tesla browser as
well as a phone in a cradle: sheets sit side by side in landscape and stack in portrait.
The service worker caches everything on first load, and the app asks for a screen wake
lock while a journey is running so the display doesn't sleep mid-game.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The three screens: setup, game, results |
| `styles.css` | Field-notebook theme (light and dark), responsive board layout |
| `cars.js` | Car silhouettes + the keyword guesser that picks one |
| `app.js` | State, scoring, timer, leaderboards, confetti |
| `sw.js` | Offline cache |
