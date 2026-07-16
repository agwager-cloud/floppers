# Foster's Floppers — Publishing Guide

This project uses two public hosts:

- **Render Web Service:** runs the Node.js/WebSocket multiplayer server.
- **itch.io HTML5 page:** hosts the Vite/Phaser browser client.

The root `render.yaml`, relative Vite build paths, Render wake/retry support, and Windows release scripts are already included.

## 1. Push the project to GitHub

Repository:

`https://github.com/agwager-cloud/floppers`

The repository is currently empty. From PowerShell:

```powershell
cd C:\Projects\floppers

git init
git branch -M main
git remote add origin https://github.com/agwager-cloud/floppers.git
git add .
git commit -m "Prepare Foster's Floppers for online release"
git push -u origin main
```

If Git says that `origin` already exists, use:

```powershell
git remote set-url origin https://github.com/agwager-cloud/floppers.git
git push -u origin main
```

Before pushing, confirm `node_modules`, `dist`, `.env`, and `.env.local` are not staged:

```powershell
git status
```

## 2. Deploy the WebSocket server on Render

Recommended Blueprint route:

1. Sign in to Render and choose **New > Blueprint**.
2. Connect the GitHub account and select `agwager-cloud/floppers`.
3. Render reads the root `render.yaml`.
4. Confirm the service:
   - Name: `fosters-floppers-server`
   - Runtime: Node
   - Plan: Free
   - Region: Singapore
   - Build: `npm ci && npm run build -w server`
   - Start: `npm run start -w server`
   - Health check: `/health`
5. Apply the Blueprint and wait for the first deploy to finish.
6. Copy the final public HTTPS URL shown by Render. It will resemble:

```text
https://fosters-floppers-server.onrender.com
```

The exact URL is the one shown in your Render dashboard. Use that exact value in the next step.

### Test Render

```powershell
cd C:\Projects\floppers
powershell -ExecutionPolicy Bypass -File .\scripts\test-render-server.ps1 `
  -RenderUrl "https://YOUR-FINAL-RENDER-URL.onrender.com"
```

A successful response contains values similar to:

```json
{
  "ok": true,
  "game": "Foster's Floppers",
  "rooms": 0
}
```

Free Render services sleep after inactivity. The client now sends a health request and retries the WebSocket connection for up to 75 seconds while displaying a server-waking message.

## 3. Build the itch.io ZIP

After Render is live, run:

```powershell
cd C:\Projects\floppers
powershell -ExecutionPolicy Bypass -File .\scripts\build-itch.ps1 `
  -RenderUrl "https://YOUR-FINAL-RENDER-URL.onrender.com"
```

The script:

- converts the Render HTTPS URL to secure `wss://`;
- builds the client with the correct production WebSocket URL;
- verifies that Vite generated relative asset paths;
- ensures `index.html` is at the ZIP root;
- creates:

```text
C:\Projects\floppers\release\Fosters-Floppers-itch.zip
```

Do not upload the project ZIP to itch.io. Upload only the ZIP created by this script.

## 4. Create the itch.io page

Recommended settings:

- Title: `Foster's Floppers`
- Project type: Games
- Kind of project/game: HTML
- Pricing: No payments or donations, unless you intentionally want donations
- Upload: `release/Fosters-Floppers-itch.zip`
- Mark the upload as playable in the browser
- Launch mode: **Click to launch in fullscreen**
- Mobile friendly: enabled
- Orientation: landscape
- Scrollbars: disabled
- Fullscreen button: enabled if available
- If using embedded mode instead: viewport 1280 × 720

Page artwork:

- Cover image: 630 × 500
- Screenshots: ideally 3–5
- Include Start, Character Select, Flop, Free Throw, and Tournament/Results views

Keep the page private while testing. After testing, edit the page and change visibility to Public.

## 5. Online multiplayer test checklist

Use at least two different devices/networks where possible.

1. Open the itch.io page on the host device.
2. Host a room and wait for the five-digit code.
3. Join from an iPad or phone using the same code.
4. Confirm Character Select synchronises.
5. Create and start a bracket.
6. Confirm simultaneous human matches work.
7. Confirm late joining enters spectator mode.
8. From spectator mode, return to the bracket and choose another live match.
9. Complete a match and verify the clutch pressure meter.
10. Complete a tournament and test Play Again and Change Players.
11. Leave the Render server idle for more than 15 minutes, then test the cold-start wake message and reconnection.

## 6. Future update workflow

### Server or shared gameplay changes

```powershell
cd C:\Projects\floppers
git add .
git commit -m "Describe the update"
git push
```

Render automatically deploys commits to `main`.

### Client update for itch.io

After pushing and after Render finishes any required server deploy, rebuild with the same final Render URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-itch.ps1 `
  -RenderUrl "https://YOUR-FINAL-RENDER-URL.onrender.com"
```

Upload the newly generated ZIP to the existing itch.io project and remove the old browser build after the new one has processed successfully.
