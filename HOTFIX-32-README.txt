FOSTER'S FLOPPERS — HOTFIX 32
Spectator Bad Dance + Delayed Scorecard Reveal

WHAT CHANGED
- Bad Dance now shakes every client currently watching the live matchup:
  * shooter
  * defender / distracting player
  * spectators watching that matchup
- Scorecards no longer reveal a made point when the shot is released.
- The visible score remains on the pre-shot total while the basketball travels.
- The point is revealed only after the complete ball-flight animation finishes.
- This timing is shared by shooters, defenders and spectators.

FILES INCLUDED
- client/src/scenes/FreeThrowScene.ts
- HOTFIX-32-README.txt

SERVER CHANGES
- None.
- No Render server update is required for functionality.

INSTALL
1. Close the local game if running.
2. Extract this ZIP into C:\Projects\floppers.
3. Choose Replace All.
4. Restart with: npm run dev

ITCH.IO
Upload the separately supplied Fosters-Floppers-itch-Hotfix-32.zip as the browser-playable HTML build.

VALIDATION
- Client production build passed.
- Server TypeScript build passed.
- Production client contains wss://fosters-floppers-server.onrender.com.
