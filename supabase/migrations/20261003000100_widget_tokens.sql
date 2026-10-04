-- Acceso del widget de Scriptable sin login: un token largo por dispositivo.
-- Solo se guarda el hash sha256 del token; el token en claro se muestra una sola vez.

create extension if not exists pgcrypto with schema extensions;

create table public.widget_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index widget_tokens_user_idx on public.widget_tokens (user_id);

alter table public.widget_tokens enable row level security;

-- El usuario ve y borra (revoca) solo sus tokens. No hay policy de insert ni update:
-- los tokens se crean únicamente con create_widget_token().
create policy "widget_tokens_select_own" on public.widget_tokens
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "widget_tokens_delete_own" on public.widget_tokens
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.widget_tokens from anon;
revoke insert, update on table public.widget_tokens from authenticated;

-- Hash que usan las dos funciones de abajo.
create or replace function public.widget_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

revoke execute on function public.widget_token_hash(text) from public, anon, authenticated;

-- Genera un token aleatorio (256 bits), guarda su hash y devuelve el token en claro.
-- Es la única vez que el token existe fuera del dispositivo del usuario.
create or replace function public.create_widget_token()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_token := 'dh_' || encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.widget_tokens (user_id, token_hash)
  values (v_user, public.widget_token_hash(v_token));

  return v_token;
end;
$$;

revoke execute on function public.create_widget_token() from public, anon;
grant execute on function public.create_widget_token() to authenticated;

-- Llamada por el widget con la anon key: devuelve los eventos no archivados del dueño del token.
create or replace function public.get_widget_events(p_token text)
returns setof public.events
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  update public.widget_tokens
     set last_used_at = now()
   where token_hash = public.widget_token_hash(p_token)
  returning user_id into v_user;

  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  return query
    select e.*
      from public.events e
     where e.user_id = v_user
       and not e.archived
     order by e.pinned desc, e.sort_order asc, e.created_at asc;
end;
$$;

revoke execute on function public.get_widget_events(text) from public;
grant execute on function public.get_widget_events(text) to anon, authenticated;
