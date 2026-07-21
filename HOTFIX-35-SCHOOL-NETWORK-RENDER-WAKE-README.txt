FOSTER'S FLOPPERS - HOTFIX 35
School network, Render cold-start and classroom connection recovery

This hotfix fixes the same start-scene connection problems found in the other
classroom games.

Main fixes
- Removes /health as a mandatory browser request.
- Adds optional GET /api/status and GET / wake requests.
- Background fetch failures can no longer block the real secure WebSocket.
- Uses a safe built-in production fallback:
  wss://fosters-floppers-server.onrender.com
- Allows up to 100 seconds for a sleeping Render free server.
- Uses controlled WebSocket retries rather than one long attempt.
- Host and Join requests use stable request IDs across retries.
- Server retries reuse the same host room/player instead of creating duplicates.
- Empty setup rooms remain available for a two-minute recovery grace period.
- Adds a fixed classroom connection panel with elapsed time and progress.
- Hides and locks native inputs while connecting so the layout stays stable on
  phones, iPads and laptops.
- Gives teachers a clear InPrivate/Incognito and school IT error message.

Deployment
1. Extract this complete hotfix over C:\Projects\floppers and replace all files.
2. Run:
   git add .
   git commit -m "Improve school network and Render wake handling"
   git push
3. Wait for the Render server to redeploy successfully.
4. Upload the accompanying Hotfix 35 itch.io ZIP to the existing itch.io page.

No new Render environment variables are required.
