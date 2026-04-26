# Deployment Guidelines (Vercel + Supabase)

## Vercel Configuration

This app is optimized for Vercel. When deploying:

1. **Connect your GitHub Repository** to Vercel.
2. In **Project Settings > Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase **Service Role** API Key (starts with `eyJ...`).
   - `COOKIE_SECRET`: A random string for secure cookies (optional, defaults are set).

## Supabase Setup (Mandatory)

### 1. Database Table
Run this in your Supabase SQL Editor:

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
```

### 2. Storage Bucket
1. Go to **Storage** in your Supabase Dashboard.
2. Create a new bucket named **`projects`**.
3. Set the bucket to **Public** (so the website can display images/videos).

## Features

- **Admin Panel**: Accessible at `/admin-panel`. 
- **Persistence**: All uploads are stored in Supabase Storage, and project data is in Supabase DB. This prevents data loss during Vercel's serverless cold starts.
- **WhatsApp Integration**: Floating button configured for client contact.
