# Integration and release notes

## Verified from public repository README (2026-10-21)
- Public repository: https://github.com/jasonw79118/kingdom-spellers
- React 19 and Vite.
- `build/` output and `npm run deploy` to GitHub Pages gh-pages branch.
- HashRouter.
- Readme documents three backend modes through `src/lib/backend.js`: Appwrite when configured, Supabase fallback, and localStorage demo. Determine active one from environment, NOT assumption.
- Readme documents the GitHub project-path default `/kingdom-spellers/`, which can conflict with custom domain root paths.

## Domain and base handling
Production target `https://www.kingdomspellers.com/`. Check Cloudflare/GitHub Pages first; don't casually edit DNS. Examine Vite base, GitHub Pages custom domain/CNAME persistence, gh-pages deployment and asset URLs. For root domain use build base `/`; use separate parameter or env for old GitHub subpath where needed, and don't break router/hashes. Check asset requests, CSS, JS, fonts and images return 200. Test after deploy. Ensure HTTPS.

## Data and security
Never commit .env, API keys, admin keys or user test passwords. Verify Appwrite/Supabase permissions and parent-child segregation before changes. Avoid rewriting stored purchase data or migration tables. No client-side server credentials. Prefer idempotent write APIs and avoid granting currency twice on retry.

## Agent inspection starting points
README.md, package.json, vite.config.js, `src/`, `src/lib/backend.js`, `public/`, `scripts/`, deployment workflow files, backend config. Capture file structure before edits. Validate filenames rather than assuming particular component paths.

## Validation
`npm install` (or `npm ci` where lockfile valid), baseline `npm run build`, available test/lint scripts as actually present. Preview built output on root path; test gameplay and logged-in state with separately supplied local test credentials, never store them in this pack.
