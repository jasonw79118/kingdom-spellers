# Kingdom Spellers — Long-Life Storybook Expansion Pack

**A safe project add-on, not a full replacement game.** Extract this folder into your project root. Nothing in this pack overwrites source code. The React/Vite agent must wire features to existing application state and cloud persistence after inspecting the repository.

## The content
- `assets/reference/`: 9 high-resolution *concept* PNGs (overview, map, seven building references, comprehensive visual board). The images are not pre-cut animated game layers. Avoid displaying the finished kingdom overview as the editable player scene: it contains buildings the player might not yet own.
- `assets/usable-buildings/`: 6 individual building PNG candidates for responsive sprite/card placement (confirm alpha, crop, alignment, scale before production).
- `data/`: machine-readable region catalog, building catalog and progression rules—**proposals**, not an approved live economy.
- `specs/`: art bible, long-term gameplay strategy, engineering architecture, child-safety rules.
- `agent/AGENT_MASTER_PROMPT.md`: instructions to paste into VS Code coding agent.
- `qa/RELEASE_GATES.md`: acceptance requirements and QA list.

## Installation
1. Back up or commit your working project first.
2. Unzip this ZIP into the root of the project. Result: `KingdomSpellers_Expansion_Pack/` in the root.
3. Ask the agent to read `KingdomSpellers_Expansion_Pack/agent/AGENT_MASTER_PROMPT.md`.
4. The agent can copy selected PNGs into `public/assets/kingdom/` and implement a React scene with conditional sprites; **do not add empty, locked buildings to an already completed kingdom by default**.
5. Review the first playable Greenwood milestone before permitting expansion to other regions.

Note: account passwords and API secrets must never be stored in this pack or the app repo.
