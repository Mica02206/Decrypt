# Enable verified squad rankings

The frontend uses your project URL and publishable key. No service-role key belongs in the website.

1. In your Supabase dashboard, open SQL Editor and run `supabase-setup.sql` once. If your leaderboard already exists, run `supabase-add-modes.sql` instead to add Normal and Hard categories without deleting results.
2. In Authentication > Users, create a staff user with an email and password (confirm the email when creating it). Share credentials privately with that staff member, not in the website source.
3. Copy that user's UUID. In SQL Editor run:

```sql
insert into public.booth_staff(user_id) values ('PASTE-USER-UUID-HERE');
```

4. Refresh the website. Public visitors can view the board. Sign in through Booth staff sign-in to submit results.

Only membership added through the dashboard grants staff access. Creating an Auth account by itself does not grant submission rights. There is no public staff registration flow. Optionally disable new sign-ups in Supabase Auth settings.

Sessions stay in memory and end on page refresh. Results are polled every 30 seconds while the page is visible. Existing local browser scores are not imported as verified results. Normal Mode and Hard Mode each show their fastest 5 results; equal times share rank. Existing results are assigned to Normal Mode by the migration.

## Verify before booth use

- Signed out: rankings load; insert attempts are rejected by the database.
- Signed in as a non-staff account: no score form; direct inserts are rejected.
- Approved staff: valid scores appear after submission and in another browser.
- Normal Mode rejects times outside 1–1200 seconds. Hard Mode rejects times outside 1–900 seconds. Blank names are rejected in both modes.
- Staff cannot grant membership, change another result, or delete results through the public API.

To revoke a staff member, delete their UUID from `booth_staff` in the dashboard. To correct an erroneous result, use the dashboard Table Editor; the website intentionally has no edit/delete permission.

Security reference: https://supabase.com/docs/guides/database/postgres/row-level-security
