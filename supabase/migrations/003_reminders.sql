create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily_log', 'medication')),
  medication_id uuid references medications(id) on delete cascade,
  time time not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reminders enable row level security;
create policy "Users manage own reminders"
  on reminders for all
  using (auth.uid() = user_id);
