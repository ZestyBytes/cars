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

1. **Setup** — each spotter gets a name, a portrait, the car they're looking for, an ink
   colour and a car silhouette. Tap the **Spotter** plate to set the portrait: upload a
   photo, pick a character outline, or use their initials. Tap the **Specimen** plate for
   the car (it also auto-picks itself from what you type).
   **Big mark on the button** chooses which of the two fills the button — the car (what
   you're hunting) or the portrait (whose button it is). The other one shows small in the
   footer of the sheet.
2. **Begin journey** — each spotter's sheet is one big button. Tap anywhere on it to
   score. The `−` on the sheet undoes a mis-tap, as does `↶` in the top bar. On a tablet
   or the car's screen in landscape, the **all-time standings sit beside the board** and
   update as you tap; a phone gives the whole screen to the buttons instead.
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
- Uploaded photos are cropped square and shrunk to 256px JPEG (a few KB each) before
  being stored, and journeys in the log reference a spotter's portrait rather than
  copying it, so the archive stays small however long you play.
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

## The specimen plates

`assets/cars/*.webp` are photographs rather than traced silhouettes: a three-quarter
view is what makes a car recognisable from the passenger seat, and flattening one to a
side profile throws that away. Their studio background is shifted onto the archive's
paper tone so a plate sits on the page rather than glowing on it, and the dark theme
dims the whole plate so it isn't a lamp in the face at night.

## Notes on tablets and the car browser

Built for a tablet in landscape first: sheets share the width equally however many
spotters are playing, the all-time rail sits to the right of the board, and everything
scales down to a phone in a cradle (rail hidden, sheets stacked in portrait).
The service worker caches everything on first load, and the app asks for a screen wake
lock while a journey is running so the display doesn't sleep mid-game.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The three screens: setup, game, results |
| `styles.css` | Field-notebook theme (light and dark), responsive board layout |
| `cars.js` | Car silhouettes + the keyword guesser that picks one |
| `avatars.js` | Portraits: character outlines, initials, photo resizing |
| `assets/cars/` | Photographed specimen plates |
| `app.js` | State, scoring, timer, leaderboards, confetti |
| `sw.js` | Offline cache |
