# PASTE INTO VS CODE AGENT — Kingdom Spellers NPC / Rewards / Decor

I extracted `KingdomSpellers_NPC_Rewards_Decor_Pack` into the root of this project. Read its `START_HERE.md`, inspect the complete concept board and individual crops, and review `agent/ASSET_MANIFEST.json` before making changes. Also inspect the current React/Vite application and related earlier art packs if present.

**Target:** Every screen should feel as though the player is exploring and learning inside one continuous illustrated kingdom; the art should match the newer immersive spelling lesson and child-friendly storybook avatars.

## Phase 0 — Audit safely
- Identify actual app architecture and player persistence. Do not assume any provider or rewrite backend logic.
- Document existing NPCs, quest hooks, reward screens, player currencies, ranks, buildings, inventory, and mobile behavior.
- Create a feature branch; preserve existing purchases and progress. Do not commit credentials or private keys.

## Phase 1 — NPCs that inhabit the kingdom
Create a reusable `NpcCharacter` presentation model with id, role, portrait asset, location, unlocked status, dialogue, quest action, and optional ambient motion. The six NPC reference roles are:
- **Master Eli**, welcoming spelling mentor at the Academy; teaches pronunciation, gives hints and encouragement.
- **Lady Grace**, town questgiver who directs suitable word challenges and provides earned rewards.
- **Blacksmith Bram**, kingdom construction / gear; connects earned progress to upgrades.
- **Professor Lyra**, bookish librarian for word lists, meanings, word families and review.
- **Captain Finn**, playful mini-game and challenge host.
- **Queen Isolde**, royal rank and new-territory progression mentor.
These are fictional character concepts; names are adjustable if conflicts exist. Do not insert characters into every view or obstruct the spelling input.

Create proper individual sprite illustrations or components based on the approved crops, matching the proportions and soft painted finish. Do not display the raw labeled crops as portraits. Avoid unlicensed third-party images and do not use a different character style.

## Phase 2 — Reward feedback system
Introduce reusable UI treatments for `word_correct`, `word_retry`, `word_mastered`, `quest_complete`, `building_unlocked`, `region_unlocked`, and `rank_up`. Use illustrated parchment cards, royal ribbons, small starbursts and reward chests. Use reduced-motion fallback and short, optional animations. Reward amounts MUST come from existing server-authoritative/game-rule logic, never from a fabricated UI-only increase. Never punish or shame children for incorrect answers.

## Phase 3 — Environment decorations
Build a reusable asset registry and decoration layer (trees, flowers, ivy, fences, cobblestone paths, bridges, lanterns, fountains, carts, tents, benches, banners, stonework). Place decor using predictable anchors/depth order and support different viewport sizes. Scenic background is allowed on empty starter territories, but purchasable buildings and premium-looking decorations must only appear when owned or unlocked. Use conservative performance: responsive image sizing, lazy-loading, compressed WebP/AVIF where appropriate; maintain transparent alternatives for sprites.

## Phase 4 — Make features feel situated
- Academy: Master Eli at the edge of the interactive spelling parchment, never under tiles.
- Library: Professor Lyra, word definitions, saved lists, review challenges.
- Marketplace: Lady Grace and Bram near shops/building previews, with contextual interactions.
- Tavern or challenge corner: Captain Finn for optional mini-games.
- Castle/map: Queen Isolde for rank and territory unlock milestones.
- Decorations visually reflect saved purchases on re-entry, not merely when clicked.

## Phase 5 — Verify
- Keyboard, touch and screen-reader flows still work for spelling tiles and typing.
- Parent and child account data remains intact; no public sharing or chat features introduced.
- No character content crowds the practice area on phones.
- Offline/error states do not award duplicate coins or unlocks.
- Build passes, lint/tests pass when available; take before/after screenshots at phone/tablet/desktop widths.
- List changed files, completed visuals, unfinished sprites, constraints and next steps in a handoff.

**Acceptance bar:** cohesive fantasy-art execution, not merely adding labels to a generic UI. Begin implementation with the Academy mentor plus correct/complete reward component, then implement decor and other NPC locations. Do not stop at writing a plan; implement a useful vertical slice, and explicitly distinguish implemented code from art concepts still requiring production-ready assets.
