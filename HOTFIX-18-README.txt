FOSTER'S FLOPPERS — HOTFIX 18
REALISTIC PLAYER PORTRAIT UPGRADE

WHAT CHANGED
- Replaced all 40 previous circular parody portraits with individually cropped,
  transparent 256 x 256 portraits from the newly supplied 8 x 5 sprite sheet.
- Preserved the exact roster order and existing character asset IDs, so every
  portrait loads against the correct parody player.
- Removed the old circular face frame from the animated player models.
- Added a subtle silhouette outline behind each transparent portrait so faces
  remain clear over bright courts, dark arenas and fast flop animations.
- Repositioned and enlarged the head/shoulder portraits on the procedural player
  bodies for a more natural scale in FlopScene, FreeThrowScene and FinalResults.
- Added matching skin tones to the procedural arms and legs for all 40 players.
- Replaced the small jersey icon in game scorecards with the matching player face.
- Added a polished selected-player portrait panel at the bottom of Character Select.
  It displays the face next to the parody name, city and jersey number without
  overlapping the 40-character grid or Confirm Player button.

FILES CHANGED
client/src/game/types.ts
client/src/game/characters.ts
client/src/game/Visuals.ts
client/src/scenes/CharacterSelectScene.ts
client/public/assets/playerFaces/*.png (all 40 portraits)

SERVER STATUS
- No server files changed.
- No Render/server push is required for this local hotfix.
- No npm install is required.

INSTALL
1. Stop the current game with Ctrl+C.
2. Extract this ZIP directly into:
   C:\Projects\floppers
3. Choose Replace All when Windows asks.
4. Restart the game:

   cd C:\Projects\floppers
   npm run dev

VALIDATION COMPLETED
- All 40 portraits verified as 256 x 256 transparent PNG files.
- Client and server TypeScript builds completed successfully.
- Vite production build completed successfully.

TEST FIRST
- Select several players across all five rows and inspect the new bottom preview.
- Start a 2-player test and inspect both scorecard faces.
- Watch the portraits during multiple flop styles, especially spins and slides.
- Check the shooter portrait in FreeThrowScene and the winner in FinalResults.
