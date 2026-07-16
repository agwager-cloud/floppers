FOSTER'S FLOPPERS — HOTFIX 03

Files included:
- client/src/game/Visuals.ts
- client/src/scenes/StartScene.ts
- client/src/scenes/CharacterSelectScene.ts
- client/src/scenes/TournamentScene.ts
- client/src/scenes/FlopScene.ts
- client/src/scenes/FreeThrowScene.ts

What this hotfix changes:
1. Start screen:
   - Name / room code panel made smaller and moved higher.
   - Buttons slightly reduced so the overlay sits more neatly under the title.

2. Character select:
   - Character names wrap more cleanly.
   - Jerseys updated to look more like basketball singlets.
   - Accent colour is now used as the singlet border.

3. Tournament scene:
   - Your own matchup is highlighted more clearly.
   - A 'YOU' tag appears on your player row.
   - Longer names wrap instead of using ellipses.

4. Flop scene:
   - Defender now steps in close before the flop animation.
   - Flop scene now refreshes properly when the same match enters a later flop sequence.

5. Free throw scene:
   - Added more robust scene refresh handling around turn changes.
   - Added a small countdown fallback safeguard for bot shooter timing.

Server changes:
- None in this hotfix.

Suggested local test:
- npm run dev
- Host a room
- Check the start screen layout
- Check character select cards
- Create a bracket and confirm your matchup is clearly highlighted
- Play through multiple flop/free-throw cycles to confirm the scene no longer appears to freeze
