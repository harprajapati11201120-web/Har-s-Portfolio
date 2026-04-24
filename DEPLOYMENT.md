# Deployment Guidelines (Railway + Supabase)

## Railway Configuration

When deploying this app to Railway, ensure you set the following in **Settings > Variables**:

- `PORT`: 3000
- `SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase **Service Role** API Key. 
  - **IMPORTANT**: This key starts with `eyJ...`. 
  - **DO NOT** use keys starting with `sb_publishable_` (those are for Stripe).

## Supabase Setup

You must create a table named `projects` in your Supabase SQL Editor:

```sql
create table projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text check (type in ('video', 'website', 'game')),
  url text,
  poster_url text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) if you want, 
-- but for this demo using the Service Role key will bypass it.
-- alter table projects enable row level security;
```

## Local Setup

1. Copy `.env.example` to `.env`.
2. Fill in your Supabase credentials.
3. Run `npm run dev`.
