FOSTER'S FLOPPERS — HOTFIX 02
Layout, bracket, timing, distraction and free-throw gameplay update

APPLY THE HOTFIX
1. Stop the local game terminals with Ctrl+C.
2. Extract this zip directly into:
   C:\Projects\floppers
3. Choose Replace All when Windows asks.
4. No npm install is required.
5. Restart the game:

   cd C:\Projects\floppers
   npm run dev

6. Open on the host PC:
   http://localhost:5173

7. Open on a phone/iPad connected to the same network:
   http://192.168.68.68:5173

CHANGES INCLUDED
- Start-scene name and room-code fields now anchor directly to the live canvas.
  They stay aligned after resizing, fullscreen changes, browser zoom, mobile
  keyboard opening and orientation changes.
- Character Select redesigned into a clean 8 x 5 grid.
- Circular placeholders replaced by coloured jersey badges and jersey numbers.
- Character names, cities, selected state and TAKEN state are more readable.
- Lobby now previews every automatic bot as soon as a tournament size is chosen.
- 2, 4, 8, 16 and 32-player selections clearly show humans, auto-fill bots and
  total entrants before Create Bracket is pressed.
- Tournament scene redesigned into large current-round matchup cards that use
  the available screen space instead of a small compressed centre column.
- Match cards show jerseys, names, scores and READY / LIVE / FINAL status.
- Free-throw meters now form one cross.
- Direction and power are represented by two moving mini basketballs.
- A shot scores when both basketballs overlap in the green centre.
- The active shooter is substantially larger.
- Successful shots visibly arc through the background hoop.
- Missed shots visibly strike the rim/backboard area and bounce away.
- Shot results remain on screen before the next attempt or scene begins.
- Human-involved flop scenes remain visible for about 6 seconds.
- Bots wait about 5.2 seconds before shooting against a human defender.
- Defender distractions now have a useful input window and no longer leave the
  defending player stuck after the bot has already completed its turn.
- Bot-only matches remain faster than human matches but are no longer instant.
- Server now broadcasts shot-in-flight and last-shot data so every participant
  and spectator sees the same shot result and animation.

TESTING COMPLETED
- TypeScript server build passed.
- TypeScript/Vite client production build passed.
- 8-player bracket test passed: 1 human + 7 bots + 4 first-round matchups.
- Human free-throw flow test passed with two visible made shots.
- Bot defender test passed: distraction accepted and bot waited approximately
  5.2 seconds before taking the shot.
