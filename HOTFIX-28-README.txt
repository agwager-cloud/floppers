FOSTER'S FLOPPERS — HOTFIX 28
Tournament Stability, Automatic Reconnect, Start Layout and Toast Fixes

CHANGES
1. Server-side match watchdog
- Added an independent watchdog that checks every active matchup twice per second.
- If a bot or human free throw reaches an expired shot clock and its scheduled callback does not run, the watchdog resolves the shot automatically.
- If a shot animation becomes stuck, the watchdog finishes it and starts the next turn.
- If a flop transition or completed round becomes overdue, the watchdog advances it.
- Scheduled match callbacks are now error-isolated so one failed callback cannot crash the Node process or freeze the entire tournament.

2. Automatic reconnect and session resume
- If an iPad, phone or computer briefly loses its WebSocket connection, the client now reconnects automatically.
- The server restores the same player/spectator session instead of requiring a refresh or creating a duplicate player.
- The reconnected client receives the newest room and matchup state immediately.

3. Start Scene
- Moved the full NAME / HOST / CODE / JOIN strip 28 pixels to the right.
- The frame, inputs, buttons and connection message remain aligned as one unit.
- Connection text now clearly warns that the Render server may take up to 60 seconds to wake.
- HOST and JOIN are visibly disabled while connecting, preventing repeated clicks/spamming.

4. Free Throw distraction message
- Toast messages now wrap to multiple lines and automatically resize their frame.
- Long bot names and distraction descriptions remain inside the orange frame on iPad and desktop.

UPDATED FILES
client/src/game/Network.ts
client/src/game/types.ts
client/src/game/Ui.ts
client/src/scenes/StartScene.ts
server/src/index.ts

INSTALL LOCALLY
1. Extract this ZIP into:
   C:\Projects\floppers
2. Choose Replace All.
3. Restart locally:
   cd C:\Projects\floppers
   npm run dev

ONLINE DEPLOYMENT
Server files changed. Push the source update to GitHub and wait for Render to redeploy before uploading the new itch.io client ZIP.

Recommended commands:
cd C:\Projects\floppers
git add client/src/game/Network.ts client/src/game/types.ts client/src/game/Ui.ts client/src/scenes/StartScene.ts server/src/index.ts
git commit -m "Hotfix 28 spectator reconnect and match watchdog"
git push origin main

After Render reports Live, upload Fosters-Floppers-itch-Hotfix-28.zip to the existing itch.io project and replace the old browser-playable ZIP.

VALIDATION
- Server TypeScript build passed.
- Client TypeScript and Vite production build passed.
- Production itch.io ZIP contains index.html at its root.
- Production client contains wss://fosters-floppers-server.onrender.com.
- Local integration test confirmed active matches continued progressing and a disconnected player could resume the same active room.
