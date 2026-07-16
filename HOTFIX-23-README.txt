FOSTER'S FLOPPERS — HOTFIX 23
Outrageous Flop Commentary + Expanded Comedy Animations

WHAT CHANGED

1. Added 16 new recorded flop-commentary clips
- The new recordings are now part of the random flop commentary pool.
- The matching written phrase is shown in the commentary panel for each new clip.
- Immediate repetition is avoided when a new flop moment is selected.
- The flop-commentary pool now contains 32 audio clips in total.

2. Commentary now plays completely
- FlopScene waits for the commentary audio COMPLETE event before routing to FreeThrowScene.
- The old short emergency fallback was replaced by a 15-second safety fallback.
- The longest new recording is approximately 4.62 seconds, so every supplied clip has ample time to finish.
- The server flop timing was also lengthened for human matches so the free-throw phase is not started too early.

3. Much more outrageous flop animations
The random flop-style pool has been expanded from 18 styles to 40 styles, including:
- seven-spin washing machine
- instant replay rewind
- courtside pinball disaster
- trade-deadline teleport
- four-point-line launch
- referee-signal tornado
- luxury-tax tumble
- shot-clock boomerang
- baseline bowling ball
- NBA logo rocket launch
- mascot cannon launch
- courtside trampoline disaster
- instant replay clone glitch
- ankle-breaker corkscrew
- scoreboard magnet malfunction

4. New comic visual effects
Every completed flop now includes a bigger comedy aftermath, such as:
- rotating rings and stars around the player
- mini basketballs and question marks orbiting in opposite directions
- colourful cartoon star bursts
- impact rings and screen shake
- random reaction captions
- ridiculous judging cards including 10.0, 11.0 and FLOP OF THE YEAR
- launch trails and spinning stars during selected animations

UPDATED FILES
- client/src/game/AudioManifest.ts
- client/src/scenes/FlopScene.ts
- server/src/index.ts
- client/public/assets/audio/flop/ (16 new MP3 files)

INSTALLATION
1. Stop the local game with Ctrl+C.
2. Extract this ZIP directly into:
   C:\Projects\floppers
3. Choose Replace All when prompted.
4. Restart the project:

   cd C:\Projects\floppers
   npm run dev

SERVER NOTE
- server/src/index.ts changed in this hotfix.
- For local testing, simply restart npm run dev.
- The project is still at the local-testing checkpoint, so no Render commands are required yet.

VALIDATION
- All 16 supplied MP3 files were verified and added.
- Longest supplied clip: approximately 4.62 seconds.
- Server TypeScript build passed.
- Client TypeScript and Vite production builds passed.
