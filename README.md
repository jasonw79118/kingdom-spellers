# Kingdom Spellers 2.0

A spelling-learning adventure game for children. Players restore a fantasy
kingdom by spelling words correctly — earning XP, repairing buildings, and
unlocking new territories.

Built with **React 19 + Vite**, **Supabase** (auth + PostgreSQL), and a
storybook-fantasy design system. Fully functional in a zero-config **demo
mode** so you can develop and test without any backend.

---

## Quick start

```bash
npm install
npm run dev
```

Then open the printed URL (default <http://localhost:3000/kingdom-spellers/>).

The app runs in **demo mode** out of the box — accounts and progress are
stored in `localStorage`. Create a parent account, add a child player, and
you're playing. No configuration required.

### Production build

```bash
npm run build     # outputs to build/
npm run preview   # serve the production build locally
```

---

## Going live with Appwrite

The app uses a single data layer (`src/lib/backend.js`) that works with
several backends behind the same async interface:

| Mode | When | Storage |
|------|------|---------|
| **Appwrite** | `VITE_APPWRITE_ENDPOINT` + `VITE_APPWRITE_PROJECT_ID` are set | Appwrite (current default) |
| **Supabase** | Supabase env vars set, Appwrite unset | Supabase PostgreSQL |
| **Demo** | Nothing configured | `localStorage` |

The SDKs are **lazily loaded**, so a project only downloads the backend it
actually uses.

### 1. Create an API key

In the [Appwrite Console](https://cloud.appwrite.io) open your project, then
**Settings → API Keys → Create API Key** with scope **Any**. Copy the key.

### 2. Create the database schema

Put the key in your `.env` (see `.env.example`) and run the setup script once:

```bash
npm run setup:appwrite
```

This creates the database, all 12 collections, their attributes and indexes.
It is **idempotent** — re-running it skips anything that already exists.

### 3. Enable email/password auth

In the console: **Auth → Settings → Registration**, enable **Email/Password**.
Optionally add a **Redirect URL** for your deployed site.

### 4. Configure the client and restart

```bash
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6abacd6a001d4161641f
VITE_APPWRITE_DB_ID=kingdom
```

Restart `npm run dev`. The app now uses Appwrite Auth + Databases.

### Using Supabase instead

`supabase/schema.sql` still contains the full PostgreSQL schema with Row
Level Security. Run it in the Supabase SQL editor, then set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` instead of the Appwrite
vars. No component code changes are needed.

---

## Project structure

```
├── scripts/
│   └── setup-appwrite.mjs    # One-time Appwrite schema setup (idempotent)
├── supabase/
│   └── schema.sql            # Optional PostgreSQL schema + RLS
├── public/                   # Static assets (images, sounds, manifest)
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Router (HashRouter — works on GitHub Pages)
│   ├── index.css             # Design system (tokens, components, responsive)
│   ├── context/
│   │   └── AuthContext.jsx   # Auth state + actions
│   ├── lib/
│   │   ├── backend.js        # Unified backend interface + lazy loader
│   │   ├── appwrite.js       # Appwrite client config
│   │   ├── appwriteBackend.js# Appwrite implementation of the interface
│   │   ├── supabase.js       # Supabase client (lazy)
│   │   ├── supabaseBackend.js# Supabase implementation of the interface
│   │   ├── localBackend.js   # localStorage demo implementation
│   │   ├── seedDictionary.js # Built-in word definitions (from v1 lists)
│   │   ├── ocr.js            # Tesseract.js OCR + word extraction
│   │   ├── speech.js         # Text-to-speech helpers
│   │   └── utils.js          # XP/levels, shuffle, weighted sampling, etc.
│   ├── components/
│   │   ├── Layout.jsx        # Top bar + mobile bottom nav
│   │   ├── Avatar.jsx        # Customizable SVG adventurer
│   │   ├── PlayerCard.jsx    # Child profile card
│   │   ├── WordCard.jsx      # Word + definition + text-to-speech
│   │   ├── StatPill.jsx      # Small stat display
│   │   └── ProgressBar.jsx   # XP / progress bar
│   ├── game/
│   │   ├── kingdom.js        # Kingdoms, buildings, ranks, gold economy
│   │   ├── mastery.js        # Mastery scoring + adaptive word selection
│   │   └── practice.js       # Session engine, puzzles, grading
│   ├── pages/
│   │   ├── LoginPage.jsx     # Sign in / create account
│   │   ├── DashboardPage.jsx # Parent home + player cards
│   │   ├── PlayersPage.jsx   # Manage child profiles + avatar editor
│   │   ├── ListsPage.jsx     # All spelling lists
│   │   ├── ListEditorPage.jsx# Type / paste words + review definitions
│   │   ├── ScanListPage.jsx  # Camera / upload + OCR review
│   │   ├── PlayPage.jsx      # Practice session
│   │   ├── KingdomPage.jsx   # Spend gold, build, claim territories
│   │   └── ProgressPage.jsx  # Parent progress report
│   └── data/                 # Seed word lists (grade 1 & 2)
└── vite.config.js            # Base path, build, dev server config
```

---

## Spelling lists

Lists can be created three ways:

1. **Type words** — add one at a time (Enter or the Add button). Commas work too.
2. **Paste words** — paste many at once, one per line or comma-separated.
   A **📋 Paste from clipboard** button reads the system clipboard directly.
3. **Scan a photo** — open the phone camera or upload an image. Text is read
   **on-device** with Tesseract.js (no paid API, nothing uploaded), then
   filtered down to likely spelling words.

Every list goes through a **review step** before saving: definitions are
looked up automatically and can be edited per word. OCR results are *never*
saved without review — you check/uncheck each word and can fix misreads
inline.

### Starter lists

Every new player automatically receives a **"Starter Words — Grade N"** list
(20 short, grade-appropriate words) so the game is playable immediately.
Existing players without a list get one the first time they open the Lists page.

### Text-to-speech

Each word card has three audio buttons: 🔊 hear the word, 📖 hear the
definition, 💬 hear the example sentence.

---

## Architecture notes

### Data layer

Every component talks to `backend` (`src/lib/backend.js`), never to Supabase
directly. The interface is identical for both backends:

```js
backend.auth.signIn(email, password)
backend.profiles.list()            // child profiles
backend.lists.list(playerId)       // spelling lists + words
backend.dictionary.lookup([words]) // cached definitions
backend.mastery.recordAttempt(playerId, word, listId, mode, correct)
backend.progress.get(playerId)
backend.catalog.listAchievements()
```

### Adaptive learning

Each `(player, word)` pair tracks attempts, accuracy, current streak, and a
`mastery_score` (0–100) that maps to a level: **new → learning → practicing
→ strong → mastered**. A word is only *mastered* after several correct
attempts, never just one. Incorrect words are weighted to reappear more often
(see `weightedSample` in `utils.js`).

### Security

- **Appwrite:** every child-owned document (profiles, lists, words, attempts,
  mastery, progress, inventory) is created with document-level permissions
  restricted to the owning parent — a parent can only ever read their own
  family's data. The shared dictionary and catalogs are readable by any
  signed-in user.
- **Supabase:** Row Level Security is enabled on every table, with policies
  limiting parents to their own children.
- Children's data is never exposed publicly in either mode.
- API keys used for setup are read from `.env` and are **never** prefixed
  with `VITE_`, so they are not bundled into the browser build.

### Routing

The app uses `HashRouter` so it works when deployed to GitHub Pages
(`https://jasonw79118.github.io/kingdom-spellers/`) without any server-side
SPA fallback configuration.

---

## Development phases

The rebuild is planned in phases — one at a time, testing after each:

- [x] **Phase 1** — Refactor to Vite, backend setup, auth, dashboard, player profiles
- [x] **Phase 2** — Spelling list database, manual/paste entry, dictionary definitions, text-to-speech
- [x] **Phase 3** — Image upload, Tesseract OCR, OCR review screen, starter lists
- [x] **Phase 4** — Mastery system, adaptive practice, progress reports, kingdom building & ranks
- [x] **Phase 5** — Core gameplay, kingdom progression, territory unlocks
- [ ] **Phase 6** — Additional game modes, overworld map, unlockables, achievements
- [ ] **Phase 7** — Polish, mobile testing, accessibility, performance, PWA, deploy

---

## Game loop

Spelling earns **gold**, gold builds your **kingdom**, and a prosperous
kingdom raises your **rank** — Esquire → Knight → Baron → Prince → King/Queen.

```
spell words correctly  →  gold + XP
spend gold            →  build buildings (each adds prosperity)
prosperity            →  rank rises
claim territories     →  5 kingdoms, each bigger than the last
```

| Territory | Buildings | Claim cost |
|-----------|-----------|------------|
| Greenwood Village | 6 | free (start here) |
| Riverstone Crossing | 5 | 500 |
| Highland Keep | 4 | 1200 |
| Crystal Caverns | 4 | 2200 |
| Dragon Peak | 4 | 3600 |

Every player's kingdom is stored in `player_progress` and persists across all
spelling lists — practising a new list never resets your buildings.

### Adaptive learning

Each word tracks attempts, correctness and streak, producing a mastery score
and one of five levels: **new → learning → practicing → strong → mastered**.

- A word can only reach *mastered* after **4 attempts and a 3-word streak** —
  one correct answer is never enough.
- Words you miss come back far more often; mastered words are shown rarely as
  spaced review.
- Practice sessions build their word list from this, so each session targets
  what the child actually needs.

Run `npm test` to verify the progression rules (33 checks covering mastery
thresholds, rank maths, and the gold economy).

---

## Project structure

---

## Tech stack

- **React 19** + **Vite 7**
- **React Router 7** (HashRouter)
- **Appwrite** (Auth + Databases) — current backend
- **Supabase** (Auth + PostgreSQL + RLS) — optional alternative
- **Framer Motion** (animations)
- **Web Speech API** (text-to-speech)
- **Tesseract.js** (on-device OCR)
- Custom SVG design system (no UI framework)
