# Brady Timeline

Brady's public progress sheet, based on https://github.com/esemmelman/bmtimelinear.

Live site: https://esemmelman.github.io/bradytimeline/

The original layout and learning rows are preserved. Weekly dates run from August 24 through December 7, 2026, with a final December 12 column. All progress starts blank.

## Run locally

    npm ci
    npm run dev

Run npm run build for the production build. GitHub Actions deploys main to GitHub Pages.

## Saved progress and editing

Uses the existing bnaimitzvah Supabase project with separate brady_status_items_v1, brady_status_dates_v1, and brady_status_cells_v1 tables. No original progress is copied. The database setup is recorded in database/setup.sql and the remote create_brady_timeline migration; do not rerun setup on an existing installation.

Viewing is public. Editor access uses the existing designated owner's Supabase password. Row-level security restricts progress changes to that owner. The browser contains only the public publishable key.
