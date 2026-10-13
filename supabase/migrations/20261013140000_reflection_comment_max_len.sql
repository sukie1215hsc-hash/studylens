-- Any non-empty reflection/comment is allowed (no min word count, no max length).
-- Columns stay `text`. Empty (whitespace-only) values are still rejected.

alter table public.reflections drop constraint if exists reflections_title_len;
alter table public.reflections add constraint reflections_title_len
  check (char_length(btrim(title)) > 0);

alter table public.reflections drop constraint if exists reflections_body_len;
alter table public.reflections add constraint reflections_body_len
  check (char_length(btrim(body)) > 0);

alter table public.comments drop constraint if exists comments_body_len;
alter table public.comments add constraint comments_body_len
  check (char_length(btrim(body)) > 0);
