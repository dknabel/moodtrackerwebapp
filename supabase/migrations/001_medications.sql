create table medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose text not null,
  scheduled_time time,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table medications enable row level security;
create policy "Users manage own medications"
  on medications for all
  using (auth.uid() = user_id);

create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  medication_id uuid not null references medications(id) on delete cascade,
  taken boolean not null default false,
  taken_at time,
  created_at timestamptz not null default now(),
  unique(user_id, date, medication_id)
);

alter table medication_logs enable row level security;
create policy "Users manage own medication logs"
  on medication_logs for all
  using (auth.uid() = user_id);
