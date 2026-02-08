# Attendance Tracker (Cloud + PIN)

A single-page, editable attendance tracking system with points, per-person detail pages, and admin controls. Access is protected by a 4-digit PIN. Data is stored in Supabase so it follows you across devices.

## Access PIN

- PIN: `1988`
- The PIN gate is client-side and intended for basic access control (not high-security use).

## Supabase Setup (Required)

1. Create a new Supabase project.
2. In **SQL Editor**, run:

```sql
create table if not exists app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "app_state_select" on app_state
for select using (true);

create policy "app_state_insert" on app_state
for insert with check (true);

create policy "app_state_update" on app_state
for update using (true) with check (true);
```

3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key

4. Update `/Users/jahromemissick/Documents/New project/app.js` with your URL and key.

## Features

- **Person Hub**: Select a person and click **Update Info** to edit their full profile on a dedicated screen.
- **Yearly Calendar**: 12-month calendar for each person with color-coded attendance by date.
- **Dashboard Calendar**: 12-month overview showing all attendance entries for everyone.
- **Day Detail Modal**: Click any date to view or edit details, with a close (X) button.

## Quick Start

1. Open `index.html` or your GitHub Pages URL.
2. Enter the PIN to unlock the app.
3. Use the **Admin** tab to add people, import/export data, or reset defaults.
4. Use **Person Hub** to view and edit a person's details and attendance history.
5. Use **Point System** to edit labels and point values.

## Notes

- Data is saved automatically on change to Supabase.
- Export JSON for backups.
