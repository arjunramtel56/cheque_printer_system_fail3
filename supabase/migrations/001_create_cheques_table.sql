create table public.cheques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  cheque_number text not null,
  bank_name text not null,
  branch_name text not null,
  account_name text not null,
  account_number text,

  payee_name text not null,
  amount numeric(14, 2) not null,
  amount_words text not null,
  cheque_date date not null,

  remarks text,
  status text not null default 'draft'
    check (status in ('draft', 'printed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cheques enable row level security;

create policy "Users can view their own cheques"
on public.cheques
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own cheques"
on public.cheques
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own cheques"
on public.cheques
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own cheques"
on public.cheques
for delete
to authenticated
using (auth.uid() = user_id);
