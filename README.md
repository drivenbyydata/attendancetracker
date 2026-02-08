# Attendance Tracker (Supabase + GitHub Pages)

A single-page, editable attendance tracking system with points, per-person detail pages, and admin controls. Data is stored in Supabase, not on the local computer.

## Supabase Setup

1. Create a new Supabase project (free tier is fine).
2. In **Auth → Users**, add a user:
   - Email: `jahrome.miss@gmail.com`
   - Password: set a strong password you will use to sign in.
3. In **SQL Editor**, run this SQL to create the storage table and policies:

```sql
create table if not exists app_state (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "app_state_select" on app_state
for select using (auth.uid() = user_id);

create policy "app_state_insert" on app_state
for insert with check (auth.uid() = user_id);

create policy "app_state_update" on app_state
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

4. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key

## Configure the App

Edit `/Users/jahromemissick/Documents/New project/app.js` and replace:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

## Run Locally

Open `/Users/jahromemissick/Documents/New project/index.html` in a browser and sign in.

## Publish on GitHub Pages

1. Create a GitHub account.
2. Create a new repository (public).
3. Upload these files to the repo root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
4. In **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
5. GitHub will provide a URL like `https://<username>.github.io/<repo>/`.

## Notes

- No attendance data is saved to the computer; only an in-memory session is used.
- You’ll need to sign in each time you open the site.
- Export JSON for backups or to move data to another account.
