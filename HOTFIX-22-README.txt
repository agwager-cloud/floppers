FOSTER'S FLOPPERS — HOTFIX 22
Curved Face Crop Fix

What changed
- Rebuilt all 40 player face PNGs again from the earlier realistic portrait source set.
- Fixed the cropping method so it no longer chops the chin off with a flat horizontal cut.
- The new crop follows a curved / diagonal jawline shape so the full face remains visible while the neck is removed.
- This removes the neck much more cleanly and should make the faces attach to the singlets more naturally.
- Kept the improved raised face positioning on the in-game player bodies.

Affected scenes
- Free Throw Scene
- Flop Scene
- Final Results Scene
- Character Select portrait usage
- Scorecards / any shared portrait usage

Files included
- client/public/assets/playerFaces/*.png (40 updated face PNGs)
- client/src/game/Visuals.ts

Server changes
- None.
- No Render/server push is required.

Install
1. Close the game if it is running.
2. Extract this ZIP into your project root:
   C:\Projects\floppers
3. Replace the existing files when prompted.
4. Restart the project:
   npm run dev

Validation
- Client and server builds both completed successfully after this update.
