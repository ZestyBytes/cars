# Car Spotter 🚗

A road-trip spotting game for two (or more). Everyone picks a car to look for — a
Tesla, a Honda Jazz, a tractor — and taps their sheet every time they see one. End the
journey and a stamped trophy says who won.

Styled as a road book in the same system as the [Noted](https://github.com/ZestyBytes/nota)
archive: pale sage paper, Space Mono and Spectral, and every player mounted on their
own sheet with mounting tape and a pinned name tag. Light by default; tapping the
“car spotter” title switches to the dark setting for night drives.

Static site: no build step, no dependencies, no network needed after first load.

## Playing

1. **Setup** — there are two cars in this game: the Tesla Model Y and the Honda Jazz.
   A player has a name, an ink colour, and one of those two, tapped to choose. Dad is set
   to the Model Y and Molly to the Jazz; extra players added for a trip pick one of the
   same two (more than one player may hunt the same car).
2. **Begin journey** — each player's sheet is one big button. Tap anywhere on it to
   score. The `−` on the sheet undoes a mis-tap. On a tablet
   or the car's screen in landscape, the **all-time standings sit beside the board** and
   update as you tap; a phone gives the whole screen to the buttons instead.
3. **End journey** — the trophy stamp strikes, confetti falls, and the trip leaderboard
   appears. Trip scores reset for the next journey; all-time totals and journeys-won keep running.
4. **All-time / Log** — the results screen has three tabs: this journey, all-time
   standings, and the log of every journey ever finished (date, winner and each
   player's tally).
5. **Reset all** — erases every score, win and recorded journey. The players stay.

## Where the scores live

Scores save as you tap, so a reload, a locked phone or a dropped signal doesn't lose
the game — an in-progress journey resumes where it left off. Finished journeys go into
the log, and the all-time totals and journeys-won keep running across them.

That record lives in the browser's own storage, which means it is **per browser and per
device**: the phone and the car's browser keep separate archives, and clearing site data
wipes it. Two things guard against that:

- The app asks the browser to mark its storage persistent, so it isn't evicted to free
  space. Adding the app to the home screen makes browsers far more likely to grant this.
- Journeys in the log store names and tallies only, about 300 bytes each, so the archive
  stays small however long you play.
There is deliberately no export or import: the record simply lives on whichever device
you play on. If the scores ever need to move between devices, or to survive a cleared
browser, that wants a backend (Supabase, the way `nota` does it) rather than a file.

## Running it

Any static host works. Locally:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Or push to GitHub Pages (Settings → Pages → deploy from branch) and open that URL in
the car.

## The car plates

`assets/cars/*.webp` are the supplied illustrations, used whole — title and all. The
artwork names the car, so nothing else on the sheet repeats it. Plates are mounted with
a border, toned like the archive's other images, and dimmed under the dark theme so a
night journey isn't lit by a bright rectangle. They are `<img>` elements rather than
backgrounds, so a plate scales itself down to whatever room a sheet has instead of
relying on viewport arithmetic.

## Notes on tablets and the car browser

Built for a tablet in landscape first: sheets share the width equally however many
players are playing, the all-time rail sits to the right of the board, and everything
scales down to a phone in a cradle (rail hidden, sheets stacked in portrait).
The service worker caches everything on first load, and the app asks for a screen wake
lock while a journey is running so the display doesn't sleep mid-game.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The three screens: setup, game, results |
| `styles.css` | Field-notebook theme (light and dark), responsive board layout |
| `cars.js` | The two cars and their plates |
| `assets/cars/` | The illustrated car plates |
| `app.js` | State, scoring, timer, leaderboards, confetti |
| `sw.js` | Offline cache |
