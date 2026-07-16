FOSTER'S FLOPPERS — HOTFIX 12

APPLY
1. Stop the local game with Ctrl+C.
2. Extract this ZIP directly into C:\Projects\floppers.
3. Choose Replace All.
4. Restart with: npm run dev

FILES INCLUDED
client/public/assets/flopperMusic.mp3
client/public/assets/whistle.mp3
client/public/assets/fosterFace.png
client/src/game/Audio.ts
client/src/game/Ui.ts
client/src/game/types.ts
client/src/scenes/BootScene.ts
client/src/scenes/FlopScene.ts
client/src/scenes/FreeThrowScene.ts
server/src/index.ts

CHANGES
- Match target changed to first to 3 points with a two-point winning margin.
- Each player receives exactly one foul/flop introduction and two opening free throws.
- After both players have had their flop scene, free throws alternate one at a time until there is a winner.
- Uploaded background music now loops across all gameplay scenes at 12% volume.
- Sound toggle pauses/resumes the background music and continues to control sound effects.
- Uploaded whistle MP3 replaces the synthesized referee whistle.
- Flop animations now vary based on 18 randomized flop styles.
- Defender visibly closes the distance before the flop begins.
- Referee is smaller and uses the supplied Scott Foster face overlay.

TESTING
- Client and server TypeScript production builds passed.
- A two-player automated match simulation completed successfully with exactly two flop scenes, alternating one-shot free throws after the opening turns, and a 3-0 result.
