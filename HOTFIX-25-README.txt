FOSTER'S FLOPPERS — HOTFIX 25
Flop Judge Card, Fair Shot Meter, Bot Accuracy and Spectator Navigation

WHAT CHANGED

1. FLOP OF THE YEAR CARD
- Enlarged and repositioned the third judge card.
- Automatically shrinks its label to remain completely inside the frame.
- Spaced all three cards so they no longer overlap each other.

2. RANDOMISED SHOT-METER SPEEDS
- Every free throw now receives a newly randomised movement profile.
- Direction and power markers move at different speeds.
- The movement remains server-authoritative and identical on all clients.

3. TWO GUARANTEED PERFECT-SHOT WINDOWS
- Every 10-second attempt now has exactly two natural moments where both
  basketball markers overlap inside the green zone.
- The first opportunity occurs during the distraction period.
- The second occurs after all distraction effects can finish, inside the
  protected final four seconds.
- A defender can spoil the first opportunity, but cannot remove the second.

4. IMPROVED BOT SHOOTING
- Increased the intended bot make rate from the previous low setting.
- Bots now choose their release from the same visible meter path as players.
- Bots facing a human defender often wait for the protected second window.
- Release positions stay smooth and do not snap from a miss into the green.
- Bots remain imperfect so scores still vary.

5. RETURN TO BRACKET WHILE SPECTATING
- Spectators and eliminated players watching another live matchup now receive
  a BACK TO BRACKET button.
- Available in both the Flop Scene and Free Throw Scene.
- Returning clears the watched match and lets the player select another LIVE
  matchup from the tournament bracket.
- Active participants cannot leave their own live matchup using this control.

FILES INCLUDED
- client/src/scenes/FlopScene.ts
- client/src/scenes/FreeThrowScene.ts
- client/src/game/types.ts
- server/src/index.ts

INSTALL
1. Stop the local game/server.
2. Extract this ZIP into:
   C:\Projects\floppers
3. Choose Replace All.
4. Restart:
   cd C:\Projects\floppers
   npm run dev

SERVER / DEPLOYMENT
- server/src/index.ts changed.
- Restarting the local server is required.
- For the deployed game, commit and push these files so Render rebuilds.

VALIDATION
- Server TypeScript build passed.
- Client TypeScript and Vite production builds passed.
- Meter profiles were simulated across all random speed combinations.
- Each simulated attempt produced exactly two green overlap windows, and the
  second window always occurred after the latest possible distraction expiry.
