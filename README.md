# Car Spotter 🚗

A road-trip spotting game for two (or more). Everyone picks a car to hunt — a Tesla,
a Honda Jazz, a tractor — and taps their big button every time they see one. End the
journey and a trophy tells you who won.

Static site: no build step, no dependencies, no network needed after first load.

## Playing

1. **Setup** — each player gets a name, the car they're hunting, a colour and a
   silhouette (the silhouette auto-picks itself from what you type, or tap to override).
2. **Start journey** — the screen becomes one big button per player. Tap anywhere in
   your panel to score. The `−` in the corner undoes a mis-tap, as does `↶` in the top bar.
3. **End journey** — trophy, confetti, and the trip leaderboard. Trip scores reset for
   the next journey; all-time totals and journeys-won keep running.
4. **All-time** — standings live behind the All-time button on the setup screen.
5. **Reset everything** — zeroes all scores and journey counts, keeps the players.

Scores save as you tap, so a reload, a locked phone or a dropped signal doesn't lose
the game — an in-progress journey resumes where it left off.

## Running it

Any static host works. Locally:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Or push to GitHub Pages (Settings → Pages → deploy from branch) and open that URL in
the car.

## Notes on the car browser

The layout is landscape-first with large targets, so it works on the Tesla browser as
well as a phone in a cradle: panels sit side by side in landscape and stack in portrait.
The service worker caches everything on first load, and the app asks for a screen wake
lock while a journey is running so the display doesn't sleep mid-game.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The three screens: setup, game, results |
| `styles.css` | Night-dashboard theme, responsive board layout |
| `cars.js` | Car silhouettes + the keyword guesser that picks one |
| `app.js` | State, scoring, timer, leaderboards, confetti |
| `sw.js` | Offline cache |
