FOSTER'S FLOPPERS — HOTFIX 31
Character Portrait Restore + Audio Transition Lock

Fixes
- Restores the realistic selected-player portrait panel at the bottom of Character Select.
- Includes all 40 player face PNGs and the portrait-loading code so the itch.io build cannot fall back to the older name-only selection bar.
- The Free Throw Scene now waits for both the ball-flight animation and the full made/miss commentary recording before routing into the next Flop Scene.
- The server adds extra transition time only when a completed free-throw pair is about to open the second Flop Scene.
- Flop commentary has an additional audio guard and cannot start while a free-throw result recording is still playing.
- This prevents two commentary recordings playing simultaneously.

Install
1. Extract this ZIP into C:\Projectsloppers.
2. Choose Replace All.
3. Restart locally with npm run dev.
4. Server files changed, so commit and push to GitHub for Render to redeploy.

Validation
- Server TypeScript build passed.
- Client TypeScript and Vite production build passed.
- The itch.io build contains all 40 player portrait assets and uses the production Render WebSocket URL.
