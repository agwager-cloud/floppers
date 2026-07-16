FOSTER'S FLOPPERS — HOTFIX 19
Head-Only Realistic Portrait Update

What changed
- Replaced all 40 player portrait PNGs with tighter head-only crops.
- Removed the visible shoulders / upper-torso artwork from the player face sprites.
- This makes the portraits attach much more naturally to the in-game bodies.
- The update applies across all scenes that use these portrait assets, including:
  * Character Select
  * Lobby / score cards where portraits appear
  * Tournament / match UI where portraits appear
  * Flop Scene
  * Free Throw Scene
  * Final Results

Why this hotfix was made
- The previous realistic portrait set still included shoulders.
- When those portraits were placed on the procedural player bodies, the heads looked incorrect.
- This hotfix keeps the more realistic likenesses, but crops them down to head-only art so the body + face combination looks much cleaner.

Files included
- 40 updated PNG files in:
  client/public/assets/playerFaces/

Server changes
- None.
- No server deployment or Render update is required.

Install
1. Close the game if it is running.
2. Extract this ZIP into your project root:
   C:\Projects\floppers
3. Allow Windows to replace the existing files.
4. Restart the local project:
   npm run dev

Validation
- Source files updated successfully.
- Client and server builds were run successfully after the asset update.
