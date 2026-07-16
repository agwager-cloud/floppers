# Update 01 developer notes

## Scene flow

```text
BootScene
→ StartScene
→ CharacterSelectScene
→ LobbyScene
→ TournamentScene
→ FlopScene
→ FreeThrowScene
→ TournamentScene between rounds
→ FinalResultsScene
```

## Background mapping

- `floppersTitleBg.jpg` — StartScene
- `floppersLobbyResultsScene.jpg` — CharacterSelect, Lobby, Tournament and FinalResults
- `floppersCourt.jpg` — FlopScene
- `floppersGameScene.jpg` — FreeThrowScene

## Networking

The server is authoritative for:

- room membership
- unique character selection
- tournament creation
- simultaneous match state
- free-throw scoring
- turn order
- win-by-two logic
- bot actions
- bracket progression
- final winner

The client sends the current horizontal and vertical meter values when Shoot is pressed. The server awards a basket only when both values are between `0.42` and `0.58`.

## Important starting points for Update 02

- `client/src/game/characters.ts` — replace placeholder cards with sprite metadata
- `client/src/scenes/FlopScene.ts` — improve foul/flop animation and add recorded audio
- `client/src/scenes/FreeThrowScene.ts` — add ball trajectory, rim collisions and defender animation
- `server/src/index.ts` — add reconnect tokens and deployment persistence if required
