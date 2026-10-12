-- StudyLens core schema
-- Private study data + public community snapshots.
-- Apply in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 2 and 24)
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default '',
  duration numeric not null,
  date date not null,
  notes text not null default '',
  mission_id text,
  created_at timestamptz not null default now(),
  constraint learning_records_title_len check (char_length(btrim(title)) > 0),
  constraint learning_records_duration_positive check (duration > 0)
);

create index learning_records_user_id_idx on public.learning_records (user_id);
create index learning_records_user_date_idx on public.learning_records (user_id, date desc);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  constraint categories_name_len check (char_length(btrim(name)) > 0),
  constraint categories_user_name_unique unique (user_id, name)
);

create index categories_user_id_idx on public.categories (user_id);

create table public.public_galaxies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  title text not null default '',
  visibility text not null default 'galaxy',
  include_notes boolean not null default false,
  map jsonb not null default '[]'::jsonb,
  stars jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint public_galaxies_visibility_check check (visibility in ('galaxy', 'records'))
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default '',
  galaxy_id uuid references public.public_galaxies (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reflections_title_len check (char_length(btrim(title)) >= 2),
  constraint reflections_body_len check (char_length(btrim(body)) >= 8)
);

create index reflections_user_id_idx on public.reflections (user_id);
create index reflections_created_at_idx on public.reflections (created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.reflections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_len check (char_length(btrim(body)) > 0)
);

create index comments_reflection_id_idx on public.comments (reflection_id);
create index comments_user_id_idx on public.comments (user_id);

-- ---------------------------------------------------------------------------
-- New Auth users get a profile from signup metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  next_name text;
begin
  raw_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  next_name := coalesce(raw_name, split_part(new.email, '@', 1), 'learner');

  if char_length(next_name) < 2 then
    next_name := 'learner';
  end if;

  if char_length(next_name) > 24 then
    next_name := left(next_name, 24);
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, next_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.learning_records enable row level security;
alter table public.categories enable row level security;
alter table public.public_galaxies enable row level security;
alter table public.reflections enable row level security;
alter table public.comments enable row level security;

-- profiles: usernames are public; only the owner may insert/update/delete
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- learning_records: private study data
create policy "learning_records_select_own"
  on public.learning_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "learning_records_insert_own"
  on public.learning_records for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "learning_records_update_own"
  on public.learning_records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "learning_records_delete_own"
  on public.learning_records for delete
  to authenticated
  using (auth.uid() = user_id);

-- categories: private
create policy "categories_select_own"
  on public.categories for select
  to authenticated
  using (auth.uid() = user_id);

create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete_own"
  on public.categories for delete
  to authenticated
  using (auth.uid() = user_id);

-- public_galaxies: anyone may read published snapshots; only owner writes
create policy "public_galaxies_select_public"
  on public.public_galaxies for select
  using (true);

create policy "public_galaxies_insert_own"
  on public.public_galaxies for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "public_galaxies_update_own"
  on public.public_galaxies for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "public_galaxies_delete_own"
  on public.public_galaxies for delete
  to authenticated
  using (auth.uid() = user_id);

-- reflections: public read; owner write
create policy "reflections_select_public"
  on public.reflections for select
  using (true);

create policy "reflections_insert_own"
  on public.reflections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "reflections_update_own"
  on public.reflections for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reflections_delete_own"
  on public.reflections for delete
  to authenticated
  using (auth.uid() = user_id);

-- comments: public read; signed-in users create; owner delete
create policy "comments_select_public"
  on public.comments for select
  using (true);

create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "comments_delete_own"
  on public.comments for delete
  to authenticated
  using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.public_galaxies, public.reflections, public.comments to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.learning_records to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.public_galaxies to authenticated;
grant select, insert, update, delete on public.reflections to authenticated;
grant select, insert, delete on public.comments to authenticated;
