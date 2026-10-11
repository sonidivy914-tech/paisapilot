-- ==========================================
-- PaisaPilot Supabase Database Setup Script
-- ==========================================

-- 1. Categories (global defaults + per-user custom)
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz default now()
);

-- 2. Transactions
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    txn_date date not null,
    description text not null,
    amount numeric(12,2) not null, -- positive number
    txn_type text not null default 'debit' check (txn_type in ('debit','credit')),
    category text not null default 'Uncategorized',
    is_unusual boolean not null default false,
    upload_batch uuid,
    created_at timestamptz default now()
);

create index if not exists idx_transactions_user_date on public.transactions (user_id, txn_date);
create index if not exists idx_transactions_user_cat on public.transactions (user_id, category);

-- 3. Monthly budgets per category
create table if not exists public.budgets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null,
    monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
    unique (user_id, category)
);

-- 4. Detected subscriptions
create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    amount numeric(12,2) not null,
    frequency text not null default 'monthly',
    last_paid date,
    next_due date,
    is_active boolean not null default true
);

-- 5. Savings goals
create table if not exists public.goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    target_amount numeric(12,2) not null check (target_amount > 0),
    saved_amount numeric(12,2) not null default 0,
    target_date date,
    created_at timestamptz default now()
);

-- 6. Enable Row Level Security (RLS)
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.goals enable row level security;

-- 7. Policies
drop policy if exists "own rows" on public.transactions;
create policy "own rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.budgets;
create policy "own rows" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.subscriptions;
create policy "own rows" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.goals;
create policy "own rows" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read global and own" on public.categories;
create policy "read global and own" on public.categories for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "write own" on public.categories;
create policy "write own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. Seed default categories
insert into public.categories (name)
select name from (values 
    ('Groceries'),
    ('Transport'),
    ('Subscription'),
    ('Food & Dining'),
    ('Shopping'),
    ('Bills & Utilities'),
    ('Health'),
    ('Entertainment'),
    ('Education'),
    ('Travel'),
    ('Income'),
    ('Uncategorized')
) as t(name)
where not exists (
    select 1 from public.categories where user_id is null and public.categories.name = t.name
);

