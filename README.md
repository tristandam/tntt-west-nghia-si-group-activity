# Group activity

Phones join by picking a name. Each round groups the checked-in players, they submit one shared photo and one thing they have in common, and points go to everyone in the group by how early that submission arrived: 10, 8, 6, 4, 2, then 1.

Youth leaders with the rater password use `/rate` to set a label. The stars match the label:

1. Heard it before
2. Playing it safe
3. Decent find
4. That's the one

Reject sets that submission to 0. The group can submit again, and the new one is scored by the time it arrives. The rater password cannot start rounds, edit the roster, or delete anything. That stays on `/admin`.

## Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The local admin password is `admin`. Raters use `rate-dev`. Change both in `.env.local` before a real event.

## Deploy on the free tiers

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`. Create a private Storage bucket named `photos` if the insert did not.
3. Create a Vercel project from this repo.
4. Set environment variables:

```
ADMIN_PASSWORD
RATER_PASSWORD
SESSION_SECRET
DATA_DRIVER=supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Use the service role key on the server only. Do not expose it to the browser.

After the event, type DELETE on the admin page to remove photos, or RESET to clear scores and rounds while keeping the roster.

Phones poll every 3 seconds. The live board is `/board`.
