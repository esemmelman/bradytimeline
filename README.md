# Brady Timeline

Brady's public progress sheet, based on https://github.com/esemmelman/bmtimelinear.

Live site: https://esemmelman.github.io/bradytimeline/

The original layout is preserved. Torah rows cover 8–23, Script rows cover 8–24, and Haftarah rows cover 40–42. Weekly dates run from August 24 through December 7, 2026, excluding August 31, with a final December 12 column. All progress starts blank.

After the original database setup, database/update-brady-readings.sql records the requested date and reading changes.

## Run locally

    npm ci
    npm run dev

Run npm run build for the production build. GitHub Actions deploys main to GitHub Pages.

## Saved progress and editing

Uses the existing bnaimitzvah Supabase project with separate brady_status_items_v1, brady_status_dates_v1, and brady_status_cells_v1 tables. No original progress is copied. The database setup is recorded in database/setup.sql and the remote create_brady_timeline migration; do not rerun setup on an existing installation.

Viewing is public. Every page opening or refresh starts in view-only mode, even with a saved login. Editor access uses a dedicated Brady Timeline Auth account (`esemmoc+bradytimeline@gmail.com`), with its own passcode and browser session storage. The shared account used by other apps is unchanged. Row-level security restricts progress changes and private notes to the Brady editor account. The browser contains only the public publishable key; no passcode is stored in source code.

In editing mode, select any prayer or reading name to open its private notes page. Notes save automatically after a brief pause and before returning to the sheet. Insert date appends today's local date after two blank lines below the last content, then places the cursor on the following line. Clear automatically saves an empty note. Items with nonblank notes display “Note” beside their names, only in editing mode. Failed saves retain the draft and offer a retry. Notes cannot be opened in view mode, and database policies restrict reading and writing notes to the designated owner.

The additive migration in `supabase/migrations/20260911213916_add_script_24_and_item_notes.sql` adds Script - 24 and the private `brady_status_notes_v1` table. Earlier database setup remains recorded in `database/`; do not rerun the original setup or reading replacement scripts on an existing installation.

`supabase/migrations/20260911221141_separate_brady_editor_login.sql` switches only the timeline's progress and note policies to the dedicated editor. Provision that confirmed user through the Auth Admin API before applying this migration to another installation.
