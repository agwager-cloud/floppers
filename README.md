# Foster's Floppers — Update 01

A local multiplayer starter build for **Foster's Floppers**, built with Phaser, Vite, TypeScript and a Node WebSocket server.

This update establishes the complete first playable tournament loop and uses the four supplied 1280×720 background images.

## Included in this update

- Start scene using `floppersTitleBg.jpg`
  - player name input
  - five-digit room code input
  - Host Game and Join Game buttons
  - sound toggle
- Character select scene using `floppersLobbyResultsScene.jpg`
  - array of 40 parody basketball characters
  - unique character reservation across connected players
  - temporary jersey-number character cards ready to be replaced by artwork later
- Tournament lobby
  - up to 32 human players
  - room code always visible
  - host can choose 2, 4, 8, 16 or 32 entrants
  - bracket automatically fills remaining places with bots
  - host can remove players before creating the bracket
- Tournament bracket
  - dynamically updates scores and winners
  - all matches in a round begin simultaneously
  - completed players can click a live matchup to spectate it
  - host begins each new round
- Flop/foul scene using `floppersCourt.jpg`
  - two animated player placeholders and a referee
  - random exaggerated flop animations
  - random humorous commentary text
  - synthesized whistle placeholder
  - score cards for both players
- Main free-throw scene using `floppersGameScene.jpg`
  - moving horizontal direction meter
  - moving vertical power meter
  - both meters must overlap their green zones to score
  - touchscreen Shoot button and keyboard Space control
  - defender distraction controls: foam finger, bad dancing and squeaky shoes
  - distractions temporarily speed up and shake the shooter’s meters
  - two free throws per normal turn
  - players swap offence and defence after each normal turn
- Match rules
  - one point for each successful free throw
  - first player to at least five points with a two-point margin wins
  - at 4–4, the game changes to alternating single free throws
  - the flop scene is skipped during the win-by-two stage
- Bot support
  - bots fill unused bracket positions
  - bot matches run automatically
  - disconnected active players are temporarily automated so a tournament cannot become permanently stuck
- Final results scene
  - tournament champion presentation
  - animated Foster's Floppers Trophy
  - confetti and Play Again support

## Folder structure

```text
floppers/
├─ client/
│  ├─ public/assets/
│  └─ src/
├─ server/
│  └─ src/
├─ package.json
└─ package-lock.json
```

## Local installation

Extract the contents of the update zip directly into the empty folder:

```text
C:\Projects\floppers
```

Then open **PowerShell** or **Command Prompt** and run:

```powershell
cd C:\Projects\floppers
npm install
npm run dev
```

The command starts both services:

- Client: `http://localhost:5173`
- WebSocket server: `http://localhost:2567`
- Server health check: `http://localhost:2567/health`

Open this in the host computer’s browser:

```text
http://localhost:5173
```

## Testing on an iPad or phone over home Wi-Fi

1. Keep `npm run dev` running on the computer.
2. Run `ipconfig` in a second terminal.
3. Find the computer’s IPv4 address, for example `192.168.68.68`.
4. On the iPad or phone, open:

```text
http://192.168.68.68:5173
```

The client automatically connects its WebSocket to the same computer address on port `2567`.

If the second device cannot connect, allow **Node.js** through Windows Defender Firewall on **Private networks**. The local test uses ports `5173` and `2567`.

## Separate development terminals

The combined command is recommended, but the two services can also be run separately.

Terminal 1:

```powershell
cd C:\Projects\floppers
npm run dev -w server
```

Terminal 2:

```powershell
cd C:\Projects\floppers
npm run dev -w client
```

## Build verification

```powershell
cd C:\Projects\floppers
npm run build
```

The source in this package has already passed the TypeScript and Vite production build.

## Controls

### Shooter

- Watch the horizontal direction marker.
- Watch the vertical power marker.
- Press **SHOOT** or the **Space bar** when both markers are inside their green zones.

### Defender

Use one of the distraction buttons while the opponent shoots. Each distraction has a brief recharge period.

### Spectator

After being eliminated, click a live bracket matchup to watch it.

## Deliberately left for later updates

- final cartoon character sprites and portraits
- recorded referee whistle, crowd, commentary and player-name audio
- more advanced flop/foul character animation
- real basketball flight and rim/net animation
- expanded host settings and tournament presentation polish
- reconnect tokens and host migration
- Render, GitHub and itch.io deployment configuration

The networking and scene structure are already separated so those additions can be made without rebuilding the project from scratch.

## Online publishing

The project is prepared for a Render WebSocket server and an itch.io HTML5 client.

- Full deployment steps: `PUBLISHING-GUIDE.md`
- Render Blueprint: `render.yaml`
- Build the browser upload after Render is live:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-itch.ps1 `
  -RenderUrl "https://YOUR-FINAL-RENDER-URL.onrender.com"
```

The generated upload is written to `release\Fosters-Floppers-itch.zip`.
