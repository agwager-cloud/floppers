Foster's Floppers — Hotfix 33

Fullscreen centering fix for itch.io and widescreen monitors.

Cause
- Phaser was already centering the 1280x720 canvas using Scale.CENTER_BOTH.
- The CSS parent was also using flexbox centering.
- On wide screens this applied the horizontal centering offset twice, pushing the game to the right.

Fix
- Removed the second CSS flex centering layer.
- The fullscreen game container now fills the available iframe/window and Phaser performs the centering once.
- The game remains 16:9 with equal black bars on the left and right when the monitor is wider than 16:9.
- Mobile landscape and iPad scaling behaviour are retained.

Files included
- client/src/style.css

Server changes
- None. Render does not require a server update.
