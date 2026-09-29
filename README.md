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

## Going live with Supabase

The app uses a single data layer (`src/lib/backend.js`) that works with two
backends behind the same async interface:

| Mode | When | Storage |
|------|------|---------|
| **Demo** | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset | `localStorage` |
| **Supabase** | Both env vars are set | Supabase PostgreSQL |

### 1. Create a Supabase project

Sign up free at <https://supabase.com> and create a new project.

### 2. Run the schema

Open **Dashboard → SQL Editor → New query**, paste the entire contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all
tables, indexes, and **Row Level Security** policies, and seeds the starter
achievements + inventory.

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your project's URL and anon key
(found under **Project Settings → API**):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server. The app now uses Supabase Auth + PostgreSQL.

### 4. Enable email auth (optional)

In **Authentication → Providers**, enable **Email**. For Google login,
enable the **Google** provider and add your OAuth credentials.

---

## Project structure

```
├── supabase/
│   └── schema.sql            # Full database schema + RLS + seed data
├── public/                   # Static assets (images, sounds, manifest)
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Router (HashRouter — works on GitHub Pages)
│   ├── index.css             # Design system (tokens, components, responsive)
│   ├── context/
│   │   └── AuthContext.jsx   # Auth state + actions
│   ├── lib/
│   │   ├── backend.js        # Unified backend interface (demo ↔ Supabase)
│   │   ├── supabase.js       # Supabase client (null in demo mode)
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
│   ├── pages/
│   │   ├── LoginPage.jsx     # Sign in / create account
│   │   ├── DashboardPage.jsx # Parent home + player cards
│   │   ├── PlayersPage.jsx   # Manage child profiles + avatar editor
│   │   ├── ListsPage.jsx     # All spelling lists
│   │   ├── ListEditorPage.jsx# Type / paste words + review definitions
│   │   └── ScanListPage.jsx  # Camera / upload + OCR review
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

- Supabase **Row Level Security** is enabled on every table.
- Parents can only read/write their **own** profile and their **children's** data.
- Children's data is never exposed publicly.
- The shared dictionary is read-only for app users.

### Routing

The app uses `HashRouter` so it works when deployed to GitHub Pages
(`https://jasonw79118.github.io/kingdom-spellers/`) without any server-side
SPA fallback configuration.

---

## Development phases

The rebuild is planned in phases — one at a time, testing after each:

- [x] **Phase 1** — Refactor to Vite, Supabase setup, auth, dashboard, player profiles
- [x] **Phase 2** — Spelling list database, manual/paste entry, dictionary definitions, text-to-speech
- [x] **Phase 3** — Image upload, Tesseract OCR, OCR review screen, starter lists
- [ ] **Phase 4** — Mastery system, adaptive practice, progress reports
- [ ] **Phase 5** — Rebuild core gameplay, castle/kingdom progression, animations
- [ ] **Phase 6** — Additional game modes, overworld, unlockables, achievements
- [ ] **Phase 7** — Polish, mobile testing, accessibility, performance, PWA, deploy

---

## Tech stack

- **React 19** + **Vite 7**
- **React Router 7** (HashRouter)
- **Supabase** (Auth + PostgreSQL + RLS)
- **Framer Motion** (animations)
- **Web Speech API** (text-to-speech)
- **Tesseract.js** (OCR — Phase 3)
- Custom SVG design system (no UI framework)
