-- Eventos del contador: "desde", "hasta" y "período".
-- Las fechas son de calendario (date), nunca timestamps: "hoy" lo decide el dispositivo.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  emoji text,
  color text not null default '#FF9500',
  kind text not null,
  start_date date not null,
  end_date date,
  count_start_day boolean not null default false,
  display_unit text not null default 'auto',
  pinned boolean not null default false,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_title_length check (char_length(btrim(title)) between 1 and 40),
  constraint events_emoji_length check (emoji is null or char_length(emoji) <= 16),
  constraint events_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint events_kind check (kind in ('since', 'until', 'range')),
  constraint events_display_unit check (display_unit in ('auto', 'days', 'weeks', 'months', 'years')),
  constraint events_range_needs_end check (kind <> 'range' or end_date is not null),
  constraint events_end_after_start check (end_date is null or end_date >= start_date)
);

create index events_user_order_idx on public.events (user_id, archived, pinned desc, sort_order);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- RLS: cada usuario solo ve y toca sus eventos.
alter table public.events enable row level security;

create policy "events_select_own" on public.events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "events_insert_own" on public.events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "events_update_own" on public.events
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "events_delete_own" on public.events
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- El rol anónimo nunca accede directo a la tabla (el widget pasa por get_widget_events).
revoke all on table public.events from anon;
