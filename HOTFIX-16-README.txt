FOSTER'S FLOPPERS — HOTFIX 16

APPLY
1. Stop the local game with Ctrl+C.
2. Extract this ZIP directly into C:\Projects\floppers.
3. Choose Replace All.
4. Restart:

   cd C:\Projects\floppers
   npm run dev

No npm install is required.
This hotfix changes both client and server files, so restart both by stopping and rerunning npm run dev.

CHANGES
- Centres the Start Scene input/button row more accurately inside its frame.
- Removes the unnecessary subtitle from Character Select.
- Removes the unnecessary subtitle from Tournament Lobby.
- Moves HOST SETTINGS down so it sits cleanly inside the right panel.
- Highlights the user's full tournament matchup card with a large light-green panel and YOUR MATCH badge.
- Adds more spectacular and varied flop effects, impact bursts, motion captions and floor-impact effects.
- Moves the referee out of the flopper's path during the exaggerated animation.
- Moves the shot-meter labels upward and improves readability.
- Rebuilds the direction/power meter as one clean plus-shaped outline, removing overlapping white borders.
- Adds a server-authoritative 10-second shot clock to every free throw.
- Animates the shot-clock colour and scale at 3, 2 and 1 seconds.
- Automatically takes the shot at the current meter positions when the server timer reaches zero.
- Restricts each defender to one distraction per free throw.
- Gives every distraction a different effect:
    FOAM FINGER: changes the horizontal direction meter.
    BAD DANCE: changes the vertical power meter.
    SQUEAKY SHOES: moves both meters in opposite directions.
- Removes the previous camera-shake/jitter behaviour from meter distractions.
- Adds server turn IDs and timing guards to prevent stale shot-clock or bot-shot timers affecting later attempts.

VERIFICATION
- Full TypeScript client/server production build passed.
- Two-player WebSocket test confirmed one-distraction enforcement.
- Server timeout test confirmed a human shot is automatically resolved after exactly 10 seconds.
