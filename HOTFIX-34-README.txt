FOSTER'S FLOPPERS — HOTFIX 34
Smooth Human Free-Throw Release

What changed
- The shot-meter basketballs now freeze immediately at the exact positions visible when the shooter presses SHOOT.
- The same frozen direction and power values are sent to the server.
- Removed the old post-click meter correction/tween that caused both basketballs to jump into a different position when the server confirmation arrived.
- Added immediate visual feedback: SHOT AWAY / RELEASE LOCKED and a small non-moving marker pulse.
- Bot, defender and spectator shot views remain compatible with the existing smooth-release logic.
- Existing delayed scorecard reveal, distraction effects, spectator shake and audio locks remain intact.

Files included
- client/src/scenes/FreeThrowScene.ts

Server changes
- None.
- No Render server deployment is required for functionality.

Install locally
1. Close the local game.
2. Extract this ZIP into C:\Projects\floppers.
3. Choose Replace All.
4. Restart with npm run dev.

Validation
- Server TypeScript build passed.
- Client TypeScript and Vite production build passed.
- Production itch.io build uses wss://fosters-floppers-server.onrender.com.
