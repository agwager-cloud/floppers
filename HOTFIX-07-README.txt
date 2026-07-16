FOSTER'S FLOPPERS — HOTFIX 07

Apply:
1. Stop npm run dev with Ctrl+C.
2. Extract the ZIP contents directly into C:\Projects\floppers.
3. Choose Replace All.
4. Run npm run dev again.

Files changed:
- client/src/scenes/StartScene.ts
- client/src/scenes/FreeThrowScene.ts
- server/src/index.ts

Fixes:
- Removed the large central Start Scene overlay.
- Added two small floating control pods outside the central-player lane.
- Keeps the centre and nearby background players visible.
- Prevents the same server shot ID from being animated twice after a scene refresh.
- Enlarges the successful meter range from 42–58% to 36–64%.
- Enlarges the visible green cross zones to match the server scoring range.
- Raises the successful basketball arc and makes it descend through the rim.
- Keeps missed-shot rim/backboard bounce behavior.
