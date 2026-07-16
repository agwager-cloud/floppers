FOSTER'S FLOPPERS — HOTFIX 13
COMMENTARY, PLAYER NAMES AND FREE-THROW AUDIO

Apply this hotfix after Hotfix 12.

INSTALL
1. Stop the local game with Ctrl+C.
2. Extract the CONTENTS of this zip directly into:
   C:\Projects\floppers
3. Choose Replace All when Windows asks.
4. Restart both client and server with:
   cd C:\Projects\floppers
   npm run dev

No npm install is required.

CHANGES
- Added 38 recorded commentator player-name clips.
- Selecting a different character now announces that highlighted player.
- Rapid character changes stop the previous name clip before playing the new one.
- Added 16 randomized flop-scene commentary clips after the whistle.
- The flop scene waits for its commentary to finish before opening the free-throw scene.
- Immediate repeat flop clips are prevented.
- Added 8 made-free-throw commentary clips.
- Added 9 missed-free-throw commentary clips.
- Made and missed commentary varies and avoids immediate repeats of the same event type.
- Background music ducks quietly under names, flop commentary and free-throw commentary.
- Updated the complete playable roster to the supplied 38 names.
- Replaced Chris Fall with Jalen Rub-A-Dub, Oklahoma #8.
- Server now assigns synchronized commentary keys to flop scenes and free-throw outcomes.

VALIDATION
- Client and server TypeScript production builds passed.
- 71 MP3 files are included and every manifest path was verified.
