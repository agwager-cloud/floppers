FOSTER'S FLOPPERS — HOTFIX 27
ONLINE PUBLISHING PREPARATION

This is an update-only hotfix. Extract it into:
C:\Projects\floppers
and choose Replace All.

WHAT THIS HOTFIX ADDS
- Render Blueprint configuration in render.yaml.
- Singapore-region free Node Web Service setup.
- /health health-check configuration.
- Secure WebSocket production build support.
- Render free-server wake request and WebSocket retry logic.
- Visible Start Scene server-waking status.
- itch.io-compatible relative Vite build paths.
- Windows PowerShell script to create the final itch.io ZIP.
- Windows PowerShell script to test the Render health endpoint.
- GitHub Actions client/server build check.
- Graceful server shutdown for Render restarts and deploys.
- Updated .gitignore for release files and environment files.
- Complete publishing guide.
- Detailed developer handover for the Hotfix 27 checkpoint.

IMPORTANT
- This hotfix does not include node_modules or the whole project.
- The final itch.io ZIP cannot be created until Render supplies the final service URL.
- After Render is live, run scripts\build-itch.ps1 with that exact URL.
- The GitHub repository is currently empty, so push the full project after installing this hotfix.

LOCAL VALIDATION COMPLETED
- Server TypeScript build: passed.
- Client TypeScript/Vite build: passed.
- Vite production paths confirmed as relative ./assets paths.
- Local /health endpoint test: passed.
- Graceful SIGTERM shutdown test: passed.

SERVER FILE CHANGED
Yes. Restart the local server after applying this update.
When published, Render will deploy server changes from GitHub.

NEXT STEPS
Read PUBLISHING-GUIDE.md and follow the order:
1. Push to GitHub.
2. Deploy Render Blueprint.
3. Test Render /health.
4. Build the itch.io ZIP with the final Render URL.
5. Upload privately to itch.io and test.
6. Set the itch.io page to Public.
