FOSTER'S FLOPPERS — HOTFIX 37
FREE-THROW CLOCK, METER AND DISTRACTION SYNCHRONISATION

PROBLEMS INVESTIGATED
- The visible shot clock could begin around 7 seconds instead of the intended 10.
- The shooter, opponent and spectators could display different marker positions.
- A spectator could see the markers outside the green overlap even though the server scored a made basket.
- Foam Finger, Bad Dance and Squeaky Shoes could arrive too late or not appear consistently on every screen.

ROOT CAUSES
1. The server began the 10-second turn before the active shooter's FreeThrowScene had fully loaded.
2. The server sent absolute timestamps, while each client compared them with its own device clock. Clock differences between laptops, iPads and phones caused different meter positions and countdowns.
3. Opponents and spectators did not snap their meter markers to the exact server-confirmed release values when a shot was submitted.
4. The distraction effect began only 250ms after the server accepted it, which was sometimes shorter than classroom network propagation and scene update delay.

HOTFIX 37 CHANGES
SERVER
- The server first broadcasts a FREE_THROW waiting state.
- The active human shooter sends FREE_THROW_READY after the scene is visible.
- The full 10,000ms shot clock starts only after that acknowledgement.
- A 3.5-second fallback protects older clients and disconnected shooters.
- Server state now includes serverNow for client clock synchronisation.
- Shot and distraction messages include the active turnId, preventing stale inputs from an earlier free throw.
- The server keeps the exact marker values submitted by the human shooter as the authoritative visual release.
- Distraction effects begin after a 500ms propagation delay and last 3 seconds.
- The Hotfix 36 final-progression recovery remains included.

CLIENT
- All shot-meter, countdown and distraction timing now uses a clock synchronised to the server.
- The shooter receives a full visible 10-second clock after the scene is ready.
- Opponents and spectators freeze both markers at the exact server-confirmed release before the ball animation begins.
- Bad Dance camera shake is scheduled from the synchronised server timestamp for shooter, defender and spectators.
- Foam Finger and Squeaky Shoes use the same synchronised timing on every screen.
- Stale SHOT and DISTRACT actions are rejected with the active turnId.

VALIDATION COMPLETED
- TypeScript syntax/transpilation checks passed for all client and server source files.
- Server gameplay tests confirmed an exact 10,000ms human shot clock.
- Tests confirmed both guaranteed centre-overlap moments calculate to direction=0.5 and power=0.5.
- Tests confirmed distractions start after 500ms and remain active for 3,000ms.
- Tests confirmed serialized room state contains a server clock timestamp.
- Generated browser modules have no missing relative imports.
- Server and key client JavaScript files passed Node syntax checks.
- Both release ZIPs passed archive integrity checks.

DEPLOYMENT
This hotfix changes BOTH the Render server and itch.io client.

1. Extract the complete project hotfix over your current C:\Projects\floppers folder.
2. Run:

   cd C:\Projects\floppers
   git add .
   git commit -m "Fix free throw clock meter and distraction sync"
   git push

3. Wait until Render reports the new deployment is live.
4. Replace the existing itch.io HTML5 upload with floppers-hotfix-37-itchio.zip.
5. Test with at least two devices: one shooter/opponent and one spectator.

No new Render environment variables are required.
