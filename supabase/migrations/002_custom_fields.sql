create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('slider', 'number', 'toggle', 'text', 'tags')),
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true,
  show_in_charts boolean not null default true,
  created_at timestamptz not null default now()
);

alter table custom_fields enable row level security;
create policy "Users manage own custom fields"
  on custom_fields for all
  using (auth.uid() = user_id);

create table field_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null references custom_fields(id) on delete cascade,
  date date not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  unique(field_id, date)
);

create index field_values_user_date on field_values (user_id, date);

alter table field_values enable row level security;
create policy "Users manage own field values"
  on field_values for all
  using (auth.uid() = user_id);

-- Seed the six default fields for every existing user.
with defaults(name, type, config, sort_order) as (
  values
    ('Mood',      'slider', '{"min":1,"max":10}'::jsonb, 0),
    ('Energy',    'slider', '{"min":1,"max":10}'::jsonb, 1),
    ('Anxiety',   'slider', '{"min":1,"max":10}'::jsonb, 2),
    ('Meals',     'number', '{}'::jsonb,                 3),
    ('Exercise',  'toggle', '{}'::jsonb,                 4),
    ('Gratitude', 'text',   '{}'::jsonb,                 5)
)
insert into custom_fields (user_id, name, type, config, sort_order)
select u.id, d.name, d.type, d.config, d.sort_order
from auth.users u
cross join defaults d;

-- Backfill history from the legacy daily_logs columns (skip nulls).
insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_rating)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Mood'
where l.mood_rating is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_energy)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Energy'
where l.mood_energy is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_anxiety)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Anxiety'
where l.mood_anxiety is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.meals_count)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Meals'
where l.meals_count is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.exercised)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Exercise'
where l.exercised is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.gratitude)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Gratitude'
where l.gratitude is not null and l.gratitude <> '';
