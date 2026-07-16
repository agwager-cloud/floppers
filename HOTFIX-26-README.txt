FOSTER'S FLOPPERS — HOTFIX 26
Clutch Pressure Shot Meter

WHAT CHANGED

1. Progressive green-zone shrinking
- The normal shot meter remains unchanged before the match reaches 3-3.
- Once the match reaches each odd deuce threshold, the green target becomes smaller:
  * 3-3: Clutch Tier 1
  * 5-5: Clutch Tier 2
  * 7-7: Clutch Tier 3
  * 9-9: Clutch Tier 4
  * 11-11 and beyond: Perfect Release Tier
- A pressure tier remains active between tied scores. For example, after reaching
  3-3, the smaller target remains for 4-3, 4-4 and 5-4 rather than suddenly
  becoming large again.

2. Perfect-release finish at 11-11+
- At 11-11 and beyond, the visible green zone is approximately the size of the
  basketball marker.
- The server uses a very small centre scoring tolerance inside that target.
- Both markers must be almost exactly centred for the shot to count.
- The two guaranteed perfect overlap opportunities remain available during the
  ten-second shot clock.

3. Clear meter labels
- The meter now displays the current pressure threshold, such as:
  CLUTCH ZONE • 3-3
- At the final tier it displays:
  PERFECT RELEASE • 11-11+

4. More balanced bot shooting
- Bot planned accuracy has been reduced from the previous roughly 80-84% level.
- Bots now begin around 64-68% planned accuracy.
- Their accuracy decreases slightly as the pressure tiers become harder.
- Bots still release from the real visible meter position, so shots remain
  smooth and do not snap or glitch into the green zone.
- Bot timing searches now use ten-millisecond samples so they can still locate
  the tiny legitimate perfect window at 11-11+.

FILES INCLUDED
- client/src/scenes/FreeThrowScene.ts
- server/src/index.ts

INSTALLATION
1. Stop the locally running game.
2. Extract this ZIP into:
   C:\Projects\floppers
3. Select Replace All when prompted.
4. Restart with:
   npm run dev

SERVER / DEPLOYMENT
- The server changed.
- Restart the local server after installing.
- For the deployed version, commit and push these files so Render rebuilds.

VALIDATION
- Server TypeScript build passed.
- Client TypeScript and Vite production builds passed.
