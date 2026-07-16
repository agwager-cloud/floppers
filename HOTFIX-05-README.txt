FOSTER'S FLOPPERS — HOTFIX 05

Replace these files in C:\Projects\floppers:
- client/src/scenes/StartScene.ts
- client/src/scenes/FreeThrowScene.ts

Fixes:
1. Start scene overlay
   - Replaced the large rectangular panel with a compact angled ticket panel.
   - Moved the name and room-code inputs beneath the title.
   - Put the inputs side-by-side and reduced the button sizes.
   - Removed the bottom starter-build label so more background players remain visible.

2. Free-throw turn crash/freeze
   - Fixed a Phaser scene-restart state bug where restartQueued remained true after the first restart.
   - Reset all transient scene references and transition guards on every create/restart.
   - Correctly routes from the bot's second free throw to the next flop scene and then to the human shooting screen.
   - Refreshes stale defender controls instead of showing "You are not the active defender."
   - Added safer post-shot routing and cleanup for destroyed UI objects.

No npm install is required.
No server files changed.
Restart with: npm run dev
