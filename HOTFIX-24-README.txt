FOSTER'S FLOPPERS — HOTFIX 24
iPad Inputs, Basketball Meter, Smooth Bot Shots, Late Spectators

WHAT CHANGED

1. iPad Start Scene input lock
- NAME and CODE inputs now capture and retain their pre-keyboard canvas position while being edited.
- Mobile Safari viewport resize/pan events no longer pull the inputs upward while the keyboard is open.
- Input text never renders below 16px, preventing Safari's automatic focus zoom.
- The page is gently returned to its normal scroll position when an input receives focus.

2. Basketball meter artwork
- Rebuilt the basketball seams using one bounded Phaser Graphics object.
- Removed the stray black line that extended to the left of both meter basketballs on iPad.
- All seams now remain inside the basketball and read as proper basketball markings.

3. Smooth bot shots
- Bots no longer select unrelated random meter coordinates at the instant they shoot.
- The server now plans a believable make/miss time along the same deterministic meter path visible to clients.
- When the bot releases, the result uses the exact live meter position at that instant.
- The client eases the final few network-delayed pixels into place over 110ms, preventing a visible snap or glitch into the green zone.

4. Late spectator joining
- Players may now enter a valid room after the bracket or tournament has started.
- Late joiners are marked as spectators and are not added to the active tournament bracket.
- Spectators are routed directly to the Tournament Scene.
- They can tap any LIVE matchup to watch the Flop and Free Throw scenes.
- Up to 40 connected humans/spectators are supported once a tournament has started.
- When the host resets the tournament, late spectators become normal players and can choose a character for the next game.

UPDATED FILES
client/src/game/CanvasTextInput.ts
client/src/game/Visuals.ts
client/src/game/types.ts
client/src/scenes/StartScene.ts
client/src/scenes/TournamentScene.ts
client/src/scenes/FreeThrowScene.ts
server/src/index.ts

INSTALLATION
1. Stop the local game with Ctrl+C.
2. Extract this ZIP directly into:
   C:\Projects\floppers
3. Choose Replace All when prompted.
4. Restart locally:
   cd C:\Projects\floppers
   npm run dev

SERVER / DEPLOYMENT
- server/src/index.ts changed.
- Restarting the local server is required.
- When deployed, commit and push these changes so Render rebuilds the server.

VALIDATION COMPLETED
- Server TypeScript build passed.
- Client TypeScript and Vite production build passed.
- A WebSocket integration test confirmed that a player joining an ACTIVE tournament receives isSpectator=true and enters successfully.
