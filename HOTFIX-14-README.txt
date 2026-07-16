FOSTER'S FLOPPERS — HOTFIX 14

CHANGES
- Restores the final two character-select players:
  • Giannis Auntie-Taco-Mayo — Milwaukee #34
  • LeBomb Flames — Los Angeles #23
- Adds both uploaded player-name recordings to Character Select audio.
- Adds the uploaded "And the winner is..." recording to Final Results.
- Final winner audio sequence is now:
  1. And the winner is...
  2. Winning parody player's recorded name
  3. Crowd celebration
- Plays crowd.mp3 whenever a free throw is made.
- Displays both the actual user/bot name and the selected parody basketball name in:
  • Tournament Lobby entrant cards
  • Tournament matchup cards
  • Flop Scene score cards
  • Free Throw Scene score cards
  • Final Results winner presentation
- Uses automatic font shrinking so long names stay inside their frames.

FILES
client/src/game/Audio.ts
client/src/game/AudioManifest.ts
client/src/game/Visuals.ts
client/src/game/characters.ts
client/src/scenes/BootScene.ts
client/src/scenes/FinalResultsScene.ts
client/src/scenes/LobbyScene.ts
client/src/scenes/TournamentScene.ts
server/src/index.ts
client/public/assets/audio/playerNames/giannis-auntie-taco-mayo.mp3
client/public/assets/audio/playerNames/lebomb-flames.mp3
client/public/assets/audio/final/and-the-winner-is.mp3
client/public/assets/audio/crowd.mp3

INSTALL
Extract the ZIP contents directly into C:\Projects\floppers and choose Replace All.
Restart with: npm run dev
No npm install is required.
