-- ============================================================================
-- Kingdom Spellers 2.0 — Supabase / PostgreSQL schema
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent: safe to run multiple times.
--
-- Security model:
--   * Every table has Row Level Security enabled.
--   * Parents authenticate via Supabase Auth (auth.users).
--   * Parents can ONLY read/write their own profile and their children's data.
--   * Children have no direct access; all access flows through the parent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PARENT PROFILES  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "parents read own profile" on public.profiles;
create policy "parents read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "parents insert own profile" on public.profiles;
create policy "parents insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "parents update own profile" on public.profiles;
create policy "parents update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. PLAYER PROFILES  (child profiles under a parent)
-- ---------------------------------------------------------------------------
create table if not exists public.player_profiles (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  avatar          jsonb not null default '{}'::jsonb,   -- { base, skin, hair, hairColor, tunic, ... }
  grade_level     int  not null default 1,             -- 1..6 elementary
  difficulty      text not null default 'medium',       -- easy | medium | hard
  xp              int  not null default 0,
  coins           int  not null default 0,
  streak          int  not null default 0,             -- consecutive practice days
  last_practice_on date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists player_profiles_parent_idx on public.player_profiles (parent_id);

alter table public.player_profiles enable row level security;

drop policy if exists "parents read own children" on public.player_profiles;
create policy "parents read own children"
  on public.player_profiles for select
  using (parent_id = auth.uid());

drop policy if exists "parents insert own children" on public.player_profiles;
create policy "parents insert own children"
  on public.player_profiles for insert
  with check (parent_id = auth.uid());

drop policy if exists "parents update own children" on public.player_profiles;
create policy "parents update own children"
  on public.player_profiles for update
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

drop policy if exists "parents delete own children" on public.player_profiles;
create policy "parents delete own children"
  on public.player_profiles for delete
  using (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. SPELLING LISTS
-- ---------------------------------------------------------------------------
create table if not exists public.spelling_lists (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  player_id   uuid references public.player_profiles (id) on delete set null,
  title       text not null,
  source      text not null default 'manual',           -- manual | paste | ocr
  created_at  timestamptz not null default now()
);

create index if not exists spelling_lists_parent_idx on public.spelling_lists (parent_id);
create index if not exists spelling_lists_player_idx on public.spelling_lists (player_id);

alter table public.spelling_lists enable row level security;

drop policy if exists "parents read own lists" on public.spelling_lists;
create policy "parents read own lists"
  on public.spelling_lists for select
  using (parent_id = auth.uid());

drop policy if exists "parents insert own lists" on public.spelling_lists;
create policy "parents insert own lists"
  on public.spelling_lists for insert
  with check (parent_id = auth.uid());

drop policy if exists "parents update own lists" on public.spelling_lists;
create policy "parents update own lists"
  on public.spelling_lists for update
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

drop policy if exists "parents delete own lists" on public.spelling_lists;
create policy "parents delete own lists"
  on public.spelling_lists for delete
  using (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. SPELLING WORDS  (words belonging to a list)
-- ---------------------------------------------------------------------------
create table if not exists public.spelling_words (
  id                  uuid primary key default gen_random_uuid(),
  list_id             uuid not null references public.spelling_lists (id) on delete cascade,
  word                text not null,
  normalized_word     text not null,                   -- lowercase, trimmed
  position            int  not null default 0,
  dictionary_word_id  uuid,                            -- set when matched to dictionary
  created_at          timestamptz not null default now()
);

create index if not exists spelling_words_list_idx on public.spelling_words (list_id);

alter table public.spelling_words enable row level security;

-- Access is inherited from the parent's ownership of the list.
drop policy if exists "parents read words in own lists" on public.spelling_words;
create policy "parents read words in own lists"
  on public.spelling_words for select
  using (
    exists (
      select 1 from public.spelling_lists l
      where l.id = spelling_words.list_id and l.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert words in own lists" on public.spelling_words;
create policy "parents insert words in own lists"
  on public.spelling_words for insert
  with check (
    exists (
      select 1 from public.spelling_lists l
      where l.id = spelling_words.list_id and l.parent_id = auth.uid()
    )
  );

drop policy if exists "parents update words in own lists" on public.spelling_words;
create policy "parents update words in own lists"
  on public.spelling_words for update
  using (
    exists (
      select 1 from public.spelling_lists l
      where l.id = spelling_words.list_id and l.parent_id = auth.uid()
    )
  );

drop policy if exists "parents delete words in own lists" on public.spelling_words;
create policy "parents delete words in own lists"
  on public.spelling_words for delete
  using (
    exists (
      select 1 from public.spelling_lists l
      where l.id = spelling_words.list_id and l.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. DICTIONARY WORDS  (cached definitions — shared, read-only for app users)
-- ---------------------------------------------------------------------------
create table if not exists public.dictionary_words (
  id               uuid primary key default gen_random_uuid(),
  word             text not null,
  normalized_word  text not null unique,
  definition       text,
  kid_definition   text,
  example_sentence text,
  part_of_speech   text,
  pronunciation    text,
  source           text not null default 'dataset',     -- dataset | parent | ai
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists dictionary_words_normalized_idx
  on public.dictionary_words (normalized_word);

alter table public.dictionary_words enable row level security;

-- Definitions are shared reference data: any signed-in parent may read them.
drop policy if exists "parents read dictionary" on public.dictionary_words;
create policy "parents read dictionary"
  on public.dictionary_words for select
  using (auth.uid() is not null);

-- Writes happen only from the server (service role) or via the dashboard.
-- Parents may edit their own child's word data, not the shared dictionary.

-- ---------------------------------------------------------------------------
-- 6. WORD ATTEMPTS  (every spelling attempt, for adaptive learning)
-- ---------------------------------------------------------------------------
create table if not exists public.word_attempts (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.player_profiles (id) on delete cascade,
  word        text not null,
  list_id     uuid references public.spelling_lists (id) on delete set null,
  mode        text not null default 'practice',        -- practice | test | game:*
  correct     boolean not null,
  created_at  timestamptz not null default now()
);

create index if not exists word_attempts_player_idx on public.word_attempts (player_id);
create index if not exists word_attempts_player_word_idx on public.word_attempts (player_id, word);

alter table public.word_attempts enable row level security;

drop policy if exists "parents read own children attempts" on public.word_attempts;
create policy "parents read own children attempts"
  on public.word_attempts for select
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = word_attempts.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert own children attempts" on public.word_attempts;
create policy "parents insert own children attempts"
  on public.word_attempts for insert
  with check (
    exists (
      select 1 from public.player_profiles p
      where p.id = word_attempts.player_id and p.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7. PLAYER WORD MASTERY  (adaptive learning state per child + word)
-- ---------------------------------------------------------------------------
create table if not exists public.player_word_mastery (
  player_id        uuid not null references public.player_profiles (id) on delete cascade,
  word             text not null,
  attempts         int  not null default 0,
  correct_attempts int  not null default 0,
  incorrect_attempts int not null default 0,
  current_streak   int  not null default 0,
  mastery_score    real not null default 0,            -- 0..100
  mastery_level    text not null default 'new',        -- new|learning|practicing|strong|mastered
  last_attempt_on  timestamptz,
  primary key (player_id, word)
);

alter table public.player_word_mastery enable row level security;

drop policy if exists "parents read own children mastery" on public.player_word_mastery;
create policy "parents read own children mastery"
  on public.player_word_mastery for select
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_word_mastery.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert own children mastery" on public.player_word_mastery;
create policy "parents insert own children mastery"
  on public.player_word_mastery for insert
  with check (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_word_mastery.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents update own children mastery" on public.player_word_mastery;
create policy "parents update own children mastery"
  on public.player_word_mastery for update
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_word_mastery.player_id and p.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 8. PLAYER PROGRESS  (kingdom / world progress — persists across lists)
-- ---------------------------------------------------------------------------
create table if not exists public.player_progress (
  player_id          uuid primary key references public.player_profiles (id) on delete cascade,
  unlocked_kingdoms  int[] not null default array[1]::int[],   -- kingdom ids unlocked
  current_kingdom    int  not null default 1,
  buildings          jsonb not null default '{}'::jsonb,        -- per-kingdom building state
  characters_unlocked text[] not null default array[]::text[],
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.player_progress enable row level security;

drop policy if exists "parents read own children progress" on public.player_progress;
create policy "parents read own children progress"
  on public.player_progress for select
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_progress.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert own children progress" on public.player_progress;
create policy "parents insert own children progress"
  on public.progress for insert
  with check (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_progress.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents update own children progress" on public.player_progress;
create policy "parents update own children progress"
  on public.player_progress for update
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_progress.player_id and p.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 9. ACHIEVEMENTS  (catalog) + PLAYER_ACHIEVEMENTS  (unlocks)
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id          text primary key,                        -- e.g. "first-word", "streak-7"
  title       text not null,
  description text not null,
  icon        text not null default 'star',            -- icon key for the UI
  created_at  timestamptz not null default now()
);

alter table public.achievements enable row level security;

drop policy if exists "anyone read achievements" on public.achievements;
create policy "anyone read achievements"
  on public.achievements for select
  using (auth.uid() is not null);

create table if not exists public.player_achievements (
  player_id      uuid not null references public.player_profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

alter table public.player_achievements enable row level security;

drop policy if exists "parents read own children achievements" on public.player_achievements;
create policy "parents read own children achievements"
  on public.player_achievements for select
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_achievements.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert own children achievements" on public.player_achievements;
create policy "parents insert own children achievements"
  on public.player_achievements for insert
  with check (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_achievements.player_id and p.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 10. INVENTORY  (cosmetic items catalog) + PLAYER_INVENTORY  (owned items)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id          text primary key,                        -- e.g. "cape-red", "pet-dragon"
  name        text not null,
  slot        text not null,                           -- hair | tunic | cape | shield | crown | companion
  rarity      text not null default 'common',          -- common | rare | epic | legendary
  created_at  timestamptz not null default now()
);

alter table public.inventory enable row level security;

drop policy if exists "anyone read inventory" on public.inventory;
create policy "anyone read inventory"
  on public.inventory for select
  using (auth.uid() is not null);

create table if not exists public.player_inventory (
  player_id uuid not null references public.player_profiles (id) on delete cascade,
  item_id   text not null references public.inventory (id) on delete cascade,
  equipped  boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (player_id, item_id)
);

alter table public.player_inventory enable row level security;

drop policy if exists "parents read own children inventory" on public.player_inventory;
create policy "parents read own children inventory"
  on public.player_inventory for select
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_inventory.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents insert own children inventory" on public.player_inventory;
create policy "parents insert own children inventory"
  on public.player_inventory for insert
  with check (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_inventory.player_id and p.parent_id = auth.uid()
    )
  );

drop policy if exists "parents update own children inventory" on public.player_inventory;
create policy "parents update own children inventory"
  on public.player_inventory for update
  using (
    exists (
      select 1 from public.player_profiles p
      where p.id = player_inventory.player_id and p.parent_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed a starter set of achievements + inventory items (idempotent).
-- ---------------------------------------------------------------------------
insert into public.achievements (id, title, description, icon) values
  ('first-word',   'First Word',      'Spell your first word correctly',        'star'),
  ('ten-words',    'Word Collector',  'Spell 10 words correctly',               'book'),
  ('streak-3',     'On a Roll',        'Practice 3 days in a row',              'flame'),
  ('streak-7',     'Week of Wonder',   'Practice 7 days in a row',              'calendar'),
  ('mastered-10',  'Master of Ten',   'Master 10 words',                        'crown'),
  ('perfect-test', 'Royal Scholar',    'Score 100% on a Royal Test',            'medal')
on conflict (id) do nothing;

insert into public.inventory (id, name, slot, rarity) values
  ('cape-blue',    'Blue Cape',      'cape',      'common'),
  ('cape-red',     'Red Cape',       'cape',      'common'),
  ('cape-royal',   'Royal Cape',     'cape',      'rare'),
  ('shield-wood',  'Wooden Shield',  'shield',    'common'),
  ('shield-knight','Knight Shield',  'shield',    'rare'),
  ('crown-brass',  'Brass Crown',    'crown',     'rare'),
  ('crown-royal',  'Royal Crown',    'crown',     'legendary'),
  ('pet-cat',      'Castle Cat',     'companion', 'common'),
  ('pet-dragon',   'Baby Dragon',    'companion', 'epic'),
  ('pet-fox',      'Forest Fox',     'companion', 'rare')
on conflict (id) do nothing;
