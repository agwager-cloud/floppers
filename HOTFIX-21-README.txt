FOSTER'S FLOPPERS — HOTFIX 21
Neckless Head Portraits + Better Figure Attachment

What changed
- Re-cropped all 40 realistic player portrait PNGs to remove the visible neck area.
- The new crops stop much closer to the jaw/chin so the portraits no longer cover the top of the singlet.
- Raised the portrait placement slightly on the procedural player body.
- This makes the faces look more naturally attached to the jersey body.

Affected scenes
- Character Select portrait usage
- Match scorecards / portrait UI
- Flop Scene player figures
- Free Throw Scene player figures
- Final Results player figure
- Any other scene using the shared player portrait assets / player figure helper

Files included
- client/public/assets/playerFaces/*.png (40 updated portrait files)
- client/src/game/Visuals.ts

Server changes
- None.
- No Render/server push is required.

Install
1. Close the game if it is running.
2. Extract this ZIP into your project root:
   C:\Projects\floppers
3. Allow the files to replace the existing ones.
4. Restart locally:
   npm run dev

Validation
- Client and server builds completed successfully after the update.
