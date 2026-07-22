FOSTER'S FLOPPERS - HOTFIX 36
Final progression and tournament-state recovery

Investigation result
Foster's Floppers already had automatic WebSocket reconnection from Hotfix 35,
but the server still contained a similar tournament-freeze risk during the
completed-round -> next bracket/final transition.

The previous watchdog only repaired a completed round when roundAdvanceAt was
still present. If that deadline or callback was lost, or if a partial next-round
state was created, every matchup could remain COMPLETE while the room stayed
ACTIVE indefinitely.

Fixes
- The watchdog now restores a missing round-transition deadline.
- Current-round match IDs are repaired from the authoritative round number.
- A transition interrupted after creating the next round is repaired back to a
  valid BRACKET state.
- A partially created or inconsistent next round/final is removed and rebuilt.
- Existing valid next-round matches are reused, preventing duplicate finals.
- A COMPLETE matchup with a missing winner is recovered from its score.
- A tied COMPLETE matchup with no recoverable winner is safely reopened in
  sudden death instead of freezing the tournament.
- Final completion is based on the single completed final match and preserves
  the correct champion.
- Repeated transition callbacks are idempotent and cannot duplicate matches.

Validation
Automated recovery tests confirmed:
- two completed semi-finals create exactly one final;
- repeating the transition does not duplicate the final;
- an incorrect partial final is rebuilt with the correct winners;
- a completed final enters COMPLETE with the correct champion;
- a missing winner is recovered from the score;
- an interrupted ACTIVE -> BRACKET transition is repaired;
- a missing round deadline is restored and advanced by the watchdog.

Deployment
This is a SERVER-ONLY hotfix. The Hotfix 35 itch.io client already contains
automatic reconnection and does not need to be uploaded again.

1. Extract this complete hotfix over C:\Projects\floppers and replace files.
2. Run:
   git add .
   git commit -m "Fix final progression and tournament recovery"
   git push
3. Wait for Render to finish deploying.

No new environment variables are required.
