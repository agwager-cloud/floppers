FOSTER'S FLOPPERS — HOTFIX 17

FAIRER DISTRACTIONS
- A defender may still use one distraction per free throw.
- New distractions can only be triggered during the first 6 seconds of the 10-second shot clock.
- The shooter receives the final 4 seconds with no new distraction allowed.
- Each effect has a short 0.25-second warning, lasts approximately 1.5 seconds, and fades in/out smoothly.
- Foam Finger briefly wobbles only the direction meter.
- Bad Dance briefly wobbles only the power meter.
- Squeaky Shoes gives both meters a smaller opposite sway.
- Late attempts are rejected by the server, not just the client.
- The game displays when distractions are open and when the protected final-four-second window begins.

PLAYER VISUALS
- Added 40 cropped cartoon character portraits from the supplied player sheet.
- The shooting and flop scene player models now use the matching parody/NBA-style cartoon face and funny visual prop.
- Existing team-coloured singlets, shorts, jersey numbers, usernames and score cards are retained.

FLOP CROWD AUDIO
- Added crowdTackle1.mp3, crowdTackle2.mp3 and crowdTackle3.mp3.
- A different crowd clip is selected for each flop, avoiding immediate repeats.
- Crowd audio starts with the referee whistle.
- Crowd volume drops quickly so the whistle remains clear and the spoken commentary can be heard.
- Spoken commentary still finishes before the scene changes to free throws.

FILES CHANGED
client/src/game/Audio.ts
client/src/game/AudioManifest.ts
client/src/game/types.ts
client/src/game/Visuals.ts
client/src/scenes/BootScene.ts
client/src/scenes/FlopScene.ts
client/src/scenes/FreeThrowScene.ts
server/src/index.ts
client/public/assets/audio/flopCrowd/*.mp3
client/public/assets/playerFaces/*.png

INSTALL
1. Stop the current game with Ctrl+C.
2. Extract this ZIP directly into C:\Projects\floppers.
3. Choose Replace All.
4. Run:
   cd C:\Projects\floppers
   npm run dev

No npm install is required.
This hotfix changes the server, so both client and server must be restarted.
