# FOSTER'S FLOPPERS — DETAILED DEVELOPER HANDOVER

**Current checkpoint:** Hotfix 27 — Online Publishing Preparation  
**Previous gameplay checkpoint:** Hotfix 26 — Clutch Pressure Meter  
**Status:** Strong local save state; project prepared for GitHub, Render, and itch.io deployment.

---

## 1. Project overview

**Game:** Foster's Floppers  
**Local folder:** `C:\Projects\floppers`  
**GitHub repository:** `https://github.com/agwager-cloud/floppers`

Foster's Floppers is a humorous online multiplayer basketball knockout tournament. Players choose parody versions of recognisable NBA players, compete through absurd flop incidents, then shoot pressure free throws. Human matches run simultaneously, and eliminated or late-joining players can spectate live matchups.

### Technology

- Client: Vite + TypeScript + Phaser 3.90
- Server: Node.js + TypeScript
- Multiplayer: custom `ws` WebSocket server
- Monorepo/workspaces: `client` and `server`
- Game resolution: 1280 × 720 landscape
- Target devices: desktop, iPad, phone landscape
- Local client: `http://localhost:5173`
- LAN client example: `http://192.168.68.68:5173`
- Local WebSocket server: port 2567
- Public server target: Render Web Service
- Public client target: itch.io HTML5

Do not include `node_modules`, `dist`, `.env`, or `.env.local` in hotfix or repository uploads.

### Main local command

```powershell
cd C:\Projects\floppers
npm run dev
```

---

## 2. Current scene flow

1. StartScene
2. CharacterSelectScene
3. LobbyScene
4. TournamentScene
5. FlopScene
6. FreeThrowScene
7. TournamentScene between rounds
8. FinalResultsScene

Shared features include room code display, sound toggle, responsive Phaser scaling, background music, multiplayer state synchronisation, and touch support.

---

## 3. Start Scene

### Current design

- Custom title background featuring Scott Foster, Tony Brothers, Bill Kennedy and flopping basketball players.
- Compact NAME / HOST / CODE / JOIN control strip beneath the title.
- Inputs use `CanvasTextInput`, not loose normal HTML inputs.
- iPad keyboard behaviour was fixed so inputs remain anchored to the Phaser canvas while typing.
- Input font sizing prevents Safari's automatic input zoom.

### Online deployment behaviour added in Hotfix 27

- The client can use a production `VITE_WS_URL` such as `wss://...onrender.com`.
- When a free Render server is asleep, the Start Scene displays a visible wake status.
- The network layer first requests `/health`, then retries WebSocket connection attempts for up to 75 seconds.
- Local testing still automatically uses `ws://<browser-host>:2567`.

Relevant files:

- `client/src/scenes/StartScene.ts`
- `client/src/game/CanvasTextInput.ts`
- `client/src/game/Network.ts`

---

## 4. Character Select

- 40 characters in an 8 × 5 grid.
- Each card shows parody name, city/team, jersey number, singlet colours, selected state and unavailable state.
- Highlighting a character plays that player's name recording.
- Previous name audio stops before the next clip begins.
- Background music ducks under name audio.
- Selected-player preview appears at the bottom with the realistic face, parody name, city and number.
- Preview is positioned to avoid obstructing the final row or Confirm Player button.

Relevant files:

- `client/src/scenes/CharacterSelectScene.ts`
- `client/src/game/characters.ts`
- `client/src/game/Visuals.ts`

---

## 5. Current 40-player roster order

The order is important because it matches the player face assets and audio mappings.

1. Luka Donut-chic — Luka Dončić
2. Shy Floppus-Salamander — Shai Gilgeous-Alexander
3. Victor Wendys-Mama — Victor Wembanyama
4. Nikola Joke-itch — Nikola Jokić
5. Cade Cupcake Spam — Cade Cunningham
6. Chef Curry-Burst — Stephen Curry
7. Jayson Tater-Tot — Jayson Tatum
8. Anthony Extra Cheese — Anthony Edwards
9. Kevin Tarantula — Kevin Durant
10. Devin Boogerworm — Devin Booker
11. Ja Tyrannosaurus-Rant — Ja Morant
12. Jimmy Peanut Butter — Jimmy Butler
13. Bam Adobayo-naise — Bam Adebayo
14. Damian Lizard — Damian Lillard
15. Donovan Glitch-ell — Donovan Mitchell
16. Trae Youngster — Trae Young
17. LaMelo Buffoon — LaMelo Ball
18. Zion Will-eat-some — Zion Williamson
19. Paolo Breadroll — Paolo Banchero
20. Franz Wagon-wheel — Franz Wagner
21. Tyrese Haliburger — Tyrese Haliburton
22. Jalen Bunsen-burner — Jalen Brunson
23. Karl-Anthony Townhouse — Karl-Anthony Towns
24. Joel Em-bidet — Joel Embiid
25. Tyrese Tax-Evasion — Tyrese Maxey
26. Kawhi Lemon-Peel — Kawhi Leonard
27. Lames Harden — James Harden
28. DeAaron Choked-on-a-Hotdog — De'Aaron Fox
29. Domantas No-Bonus — Domantas Sabonis
30. The Chettysburg Address — Chet Holmgren
31. Jaylen Fudge Brownie — Jaylen Brown
32. Scottie Barbecue — Scottie Barnes
33. Alperen Spaghoonies — Alperen Şengün
34. Jalen Greenbeans — Jalen Green
35. Austin Leaves — Austin Reaves
36. Rudy Go-burp — Rudy Gobert
37. Draymond Scream — Draymond Green
38. Jalen Rub-A-Dub — Jalen Williams / JDub
39. Giannis Auntie-Taco-Mayo — Giannis Antetokounmpo
40. LeBomb Flames — LeBron James

The current code uses asset IDs such as `luka-donut`, `shai-gorgeous`, `joke-itch`, etc. Inspect `characters.ts` and `BootScene.ts` rather than renaming files from the displayed parody names.

---

## 6. Player portrait system

Hotfixes 18–22 replaced the old circular generic face system with realistic cartoon likenesses.

### Current portrait implementation

- 40 separate transparent PNGs in `client/public/assets/playerFaces`.
- Portraits are cropped around the face using a curved jawline cut rather than a flat horizontal cut.
- Portraits avoid visible shoulders and minimise neck overlap over the procedural singlet.
- Shared `createPlayerPortrait` and `createPlayerFigure` helpers are used across scenes.
- Portrait positioning was raised on the body for a more natural attachment.
- The figure is still procedural below the face: singlet, number, arms, shorts, legs and shoes.

Portraits appear in:

- Character Select preview
- scorecards
- Free Throw Scene player figure
- Flop Scene player figures
- Final Results winner figure

Relevant files:

- `client/public/assets/playerFaces/*.png`
- `client/src/game/Visuals.ts`
- `client/src/scenes/BootScene.ts`

---

## 7. Lobby and tournament setup

The host can choose brackets of:

- 2
- 4
- 8
- 16
- 32

Bots fill all remaining positions.

Lobby information includes:

- human username or bot name
- selected parody player
- jersey number
- host indicator
- bot/auto-fill state
- manage-player controls for the host

Relevant file:

- `client/src/scenes/LobbyScene.ts`

---

## 8. Tournament bracket and spectator system

### Tournament behaviour

- Dynamic brackets support 2–32 entrants.
- Human matches occur simultaneously.
- Bot-only matches simulate automatically.
- Match states include READY / LIVE / FINAL equivalents.
- User matchups are clearly highlighted.
- Names wrap rather than relying on obstructive ellipses.

### Spectators

- Eliminated players can select live matchups to spectate.
- Players may join after the tournament has started and enter as spectators.
- Late spectators do not consume tournament entrant slots.
- Spectators can use **BACK TO BRACKET** from FlopScene and FreeThrowScene.
- They can then choose another live matchup.
- Maximum room population during a running tournament is 40 connected humans/spectators.

Relevant files:

- `client/src/scenes/TournamentScene.ts`
- `client/src/scenes/FlopScene.ts`
- `client/src/scenes/FreeThrowScene.ts`
- `client/src/game/GameSession.ts`
- `server/src/index.ts`

---

## 9. Match rules

Current win condition:

- first to at least 3 points;
- winner must lead by 2.

Examples:

- 3–0 wins
- 3–1 wins
- 3–2 continues
- 4–2 wins
- 5–3 wins

Opening sequence:

1. Player A receives one Flop Scene.
2. Player A shoots two free throws.
3. Player B receives one Flop Scene.
4. Player B shoots two free throws.

After each player has completed one flop:

- alternate one free throw at a time;
- no more flop scenes;
- continue until one player leads by two.

---

## 10. Flop Scene — current funniest feature

The Flop Scene is intentionally the most over-the-top part of the game.

### Current animation system

- Defender moves close before the alleged contact.
- Referee moves away from the flopper's path.
- Approximately 40 animation styles are available, including spins, launches, trampoline disasters, corkscrews, teleports, tumbles and pinball effects.
- Comedy aftermath can include rotating stars, basketball orbits, question marks, impact rings, colourful bursts, screen shake and absurd judging cards.
- Judge cards include values such as 10.0 and 11.0.
- “FLOP OF THE YEAR” was resized/repositioned so it fits inside its frame.

### Commentary

- Original commentary pool plus 16 newer NBA-themed recordings.
- New phrases include luxury-tax, trade-demand, four-point-line, freight-train shoelace, tanking, concussion-protocol, G League, laws-of-physics and Scott Foster jokes.
- Immediate audio repeats are prevented.
- Whistle and crowd tackle sound play together.
- Commentary plays after the initial impact audio.
- The client waits for the commentary sound's completion event before changing scenes.
- A long emergency fallback exists, so even 4–5 second recordings can finish before FreeThrowScene loads.

Relevant files:

- `client/src/scenes/FlopScene.ts`
- `client/src/scenes/BootScene.ts`
- `client/src/game/Visuals.ts`
- `server/src/index.ts`
- `client/public/assets/audio/flop`
- `client/public/assets/audio/flopCrowd`

---

## 11. Free Throw Scene

### Shot meter

- Direction and power are shown as a cross-shaped meter.
- One moving basketball represents direction.
- One moving basketball represents power.
- Both markers must overlap inside the green area.
- Basketball seam artwork was fixed so it does not have a stray black line pointing left.
- Meter movement is server-driven and visually smoothed.
- Bot shots use the visible meter position rather than snapping to an unrelated score coordinate.

### Shot clock and distraction

- Server-controlled 10-second shot clock.
- Defender can use one distraction per free throw.
- Distractions are allowed for the first 6 seconds.
- Final 4 seconds are protected.
- The first perfect opportunity can be disrupted.
- A second legitimate perfect opportunity occurs inside the protected window.
- Old timer callbacks are prevented from affecting later shots.

### Distraction options

1. Foam Finger — direction
2. Bad Dance — power
3. Squeak Shoes — both with a smaller opposite sway

### Bot balance

- Bot accuracy was reduced from the overly accurate setting.
- Bot releases remain smooth and use real displayed positions.
- Random meter speed profiles create variety while preserving valid centre-overlap opportunities.

---

## 12. Clutch Pressure Meter — Hotfix 26

To prevent endless high-scoring deuce matches, the green zone progressively shrinks after odd tied-score thresholds.

Pressure tiers:

- before 3–3: normal zone
- 3–3 reached: first clutch reduction
- 5–5 reached: smaller
- 7–7 reached: smaller again
- 9–9 reached: highly precise
- 11–11 and beyond: near-perfect release

Important behaviour:

- Once a tier is reached, it remains active until the next tier.
- It does not expand during intermediate scores such as 4–3 or 5–4.
- At 11–11+, the visible green zone is only about large enough to contain the basketball marker.
- The actual centre scoring tolerance is very small.
- Bots receive a slight accuracy reduction as pressure increases.
- The UI displays labels such as `CLUTCH ZONE • 3-3` and `PERFECT RELEASE • 11-11+`.

Relevant files:

- `client/src/scenes/FreeThrowScene.ts`
- `server/src/index.ts`

---

## 13. Audio system

Background music:

- `flopperMusic.mp3`
- loops across scenes
- normal volume around 12%
- ducks beneath player names, commentary and winner announcements
- controlled by shared sound toggle

Player names:

- 40 name recordings
- play on Character Select highlight
- previous clip is stopped before next one begins

Flop audio:

1. whistle
2. crowd tackle simultaneously
3. random commentary
4. scene waits for commentary completion

Free throw results:

- random made commentary pool
- random missed commentary pool
- immediate repeats avoided
- made shot can include `crowd.mp3`

Final Results sequence:

1. `and-the-winner-is.mp3`
2. winning parody player's name audio
3. crowd sound

---

## 14. Final Results

Current Final Results includes:

- tournament winner
- human/bot username
- parody basketball identity
- winner player figure
- trophy and celebration
- winner audio sequence
- Play Again
- Change Players

Play Again:

- returns to tournament setup;
- preserves selected human characters;
- clears the completed bracket.

Change Players:

- removes bots;
- clears human character selections;
- returns connected humans to Character Select.

Relevant files:

- `client/src/scenes/FinalResultsScene.ts`
- `server/src/index.ts`

---

## 15. Online publishing preparation — Hotfix 27

### Vite / itch.io

Added `client/vite.config.ts` with:

```ts
base: './'
```

This is essential because itch.io hosts the game inside a generated subdirectory. The production `index.html`, JavaScript and CSS now use relative URLs.

### Render Blueprint

Added root `render.yaml`:

- service name: `fosters-floppers-server`
- Node runtime
- free plan
- Singapore region
- server-only build command
- server start command
- `/health` health check
- Node 20.19.5
- auto-deploy on commit

### Release scripts

Added:

- `scripts/build-itch.ps1`
- `scripts/test-render-server.ps1`

`build-itch.ps1` takes the final Render HTTPS URL, converts it to WSS, builds the client, validates relative paths and produces:

`release\Fosters-Floppers-itch.zip`

The ZIP has `index.html` at its root and is the file to upload to itch.io.

### Render cold start handling

The network client now:

- wakes the Render health endpoint;
- retries WebSocket connections;
- allows up to 75 seconds;
- shows visible status on StartScene;
- preserves normal local and LAN behaviour.

### Deployment robustness

- Server already listens on `0.0.0.0` and Render's `PORT`.
- Server exposes `/health` and `/` JSON endpoints.
- Server supports secure public WebSockets through Render.
- Graceful `SIGTERM` / `SIGINT` shutdown was added.
- GitHub Actions build workflow validates client and server on pushes and pull requests.

Relevant files:

- `render.yaml`
- `client/vite.config.ts`
- `client/.env.production.example`
- `client/src/game/Network.ts`
- `client/src/scenes/StartScene.ts`
- `server/src/index.ts`
- `.github/workflows/build.yml`
- `scripts/build-itch.ps1`
- `scripts/test-render-server.ps1`
- `PUBLISHING-GUIDE.md`

---

## 16. Publishing order

1. Apply Hotfix 27.
2. Run `npm run build` locally.
3. Push the full project to the empty GitHub repository.
4. Create a Render Blueprint from the repository.
5. Wait for the Render server to deploy.
6. Test the Render `/health` endpoint.
7. Run `scripts/build-itch.ps1` with the final Render URL.
8. Upload the generated itch ZIP as an HTML game.
9. Keep the itch page private for multiplayer testing.
10. Test desktop, iPad, phone, late spectators, cold start and a full tournament.
11. Change itch page visibility to Public.

Full instructions are in `PUBLISHING-GUIDE.md`.

---

## 17. Important files to inspect in future chats

Client scenes:

- `client/src/scenes/BootScene.ts`
- `client/src/scenes/StartScene.ts`
- `client/src/scenes/CharacterSelectScene.ts`
- `client/src/scenes/LobbyScene.ts`
- `client/src/scenes/TournamentScene.ts`
- `client/src/scenes/FlopScene.ts`
- `client/src/scenes/FreeThrowScene.ts`
- `client/src/scenes/FinalResultsScene.ts`

Client utilities:

- `client/src/game/characters.ts`
- `client/src/game/Visuals.ts`
- `client/src/game/Ui.ts`
- `client/src/game/GameSession.ts`
- `client/src/game/Network.ts`
- `client/src/game/SceneRouter.ts`
- `client/src/game/CanvasTextInput.ts`
- `client/src/game/types.ts`

Deployment:

- `render.yaml`
- `client/vite.config.ts`
- `scripts/build-itch.ps1`
- `PUBLISHING-GUIDE.md`

Server:

- `server/src/index.ts`

Assets:

- `client/public/assets`

Always inspect the latest project rather than relying only on this handover, because future hotfixes may update shared helpers or mappings.

---

## 18. Final pre-publication test checklist

### Local

- both builds pass
- host/join works
- iPad inputs remain fixed while typing
- all 40 portraits and name clips load
- bracket sizes work
- bots fill correctly
- human matches run simultaneously
- Flop Scene commentary completes before transition
- outrageous visual effects stay inside frames
- free throw marker artwork is clean
- bot shots move smoothly
- clutch zones shrink correctly
- late spectator join works
- spectator can return to bracket
- final winner sequence works

### Online

- Render `/health` returns `{ ok: true }`
- itch ZIP has `index.html` at root
- no absolute `/assets/` paths in production HTML
- itch client connects with `wss://`
- free Render cold start message appears and eventually connects
- host and join work across separate devices
- no mixed-content browser errors
- mobile landscape/fullscreen works
- full tournament completes online

---

## 19. Current save-state warning

This is a strong checkpoint. Do not rebuild the game from scratch. Preserve:

- Hotfix 26 clutch-pressure logic
- current bot balance
- two valid perfect-overlap opportunities
- distraction protection window
- late spectator system
- outrageous flop audio timing
- current realistic face assets
- iPad input anchoring
- update-only hotfix workflow

The immediate next objective is deployment and public multiplayer testing, not another gameplay redesign.
