Foster's Floppers — Hotfix 30

Bad Dance visibility fix

Changes:
- Bad Dance now shakes the screen for both human players in the active matchup:
  * the shooter
  * the distracting defender
- The defender's Free Throw Scene no longer restarts immediately after their distraction is accepted.
- Distraction buttons are disabled and dimmed in place after use, preserving the full three-second camera shake.
- Spectators are not shaken because they are not one of the two active players.

Files included:
- client/src/scenes/FreeThrowScene.ts

Server changes:
- None.
- No Render server update is required for functionality.

Install:
1. Extract this ZIP into C:\Projects\floppers
2. Choose Replace All.
3. Restart locally with npm run dev.
4. Upload the accompanying Hotfix 30 itch.io ZIP to update the live client.

Validation:
- Client TypeScript and Vite production builds completed successfully.
