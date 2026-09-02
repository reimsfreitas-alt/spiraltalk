create table if not exists public.sessions(id uuid default gen_random_uuid() primary key,user_id uuid references auth.users(id) on delete cascade not null,title text default 'Nova Conversa',status text default 'active' check(status in('active','closed')),topic_key text default 'default',created_at timestamptz default now() not null,updated_at timestamptz default now() not null);
create table if not exists public.messages(id uuid default gen_random_uuid() primary key,session_id uuid references public.sessions(id) on delete cascade not null,role text not null check(role in('user','assistant')),content text not null,created_at timestamptz default now() not null);
create table if not exists public.structures(id uuid default gen_random_uuid() primary key,session_id uuid references public.sessions(id) on delete cascade not null,central_question text not null,declared_factors text[] default '{}',constraints text[] default '{}',alternatives text[] default '{}',decision_state text not null check(decision_state in('decision','intention','possibility','doubt','hypothesis','none')),declared_decision text,open_questions text[] default '{}',declared_changes text[] default '{}',memory_candidates text[] default '{}',confidence numeric default 0,created_at timestamptz default now() not null);
create table if not exists public.continuity_states(id uuid default gen_random_uuid() primary key,user_id uuid references auth.users(id) on delete cascade not null,topic_key text not null default 'default',central_question text not null,active_factors text[] default '{}',constraints text[] default '{}',alternatives text[] default '{}',declared_decision text,open_questions text[] default '{}',declared_changes text[] default '{}',last_summary text,updated_at timestamptz default now() not null,unique(user_id,topic_key));

create table if not exists public.learning_events(
  id uuid default gen_random_uuid() primary key,
  pseudonym text not null,
  factor_types text[] default '{}',
  act text,
  intervention text,
  signal text not null,
  created_at timestamptz default now() not null
);
create index if not exists learning_events_created_at_idx on public.learning_events(created_at);

create table if not exists public.learning_aggregates_daily(
  day date not null,
  factor_types text[] default '{}',
  signal text not null,
  count integer not null,
  distinct_pseudonyms integer not null,
  primary key(day,factor_types,signal)
);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.structures enable row level security;
alter table public.continuity_states enable row level security;
alter table public.learning_events enable row level security;
alter table public.learning_aggregates_daily enable row level security;

create policy if not exists "own sessions" on public.sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy if not exists "own messages" on public.messages for all using(session_id in(select id from public.sessions where user_id=auth.uid())) with check(session_id in(select id from public.sessions where user_id=auth.uid()));
create policy if not exists "own structures" on public.structures for all using(session_id in(select id from public.sessions where user_id=auth.uid())) with check(session_id in(select id from public.sessions where user_id=auth.uid()));
create policy if not exists "own continuity" on public.continuity_states for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy if not exists "learning service insert" on public.learning_events for insert with check(auth.role() in('authenticated','service_role'));
