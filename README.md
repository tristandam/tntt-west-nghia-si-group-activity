# Group activity

Phones join by picking a name. Each round groups the checked-in players, they submit one shared photo and one thing they have in common, and everyone in the group gets the same points. Most of the points come from how original the answer is: 1, 4, 7, or 10. The first answer in the round also gets +2, and the second gets +1.

A cheap model rates each answer a few seconds after it is submitted. The stars match the label, and a one-sentence comment explains it. That rating is what sets the main points. Until the rating arrives, only the speed bonus is counted. On the admin page, a leader can press a label to set or replace that score.

1. Heard it before
2. Playing it safe
3. Decent find
4. That's the one

Reject, on the admin page, sets that submission to 0. The group can submit again, and the new one is scored by the time it arrives.

## Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The local admin password is `admin`. Change it in `.env.local` before a real event. Add `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey). The default model is `gemini-3.5-flash-lite`.

## Deploy on the free tiers

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`. Create a private Storage bucket named `photos` if the insert did not.
3. Create a Vercel project from this repo.
4. Set environment variables:

```
ADMIN_PASSWORD
SESSION_SECRET
DATA_DRIVER=supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

Use the service role key on the server only. Do not expose it to the browser.

After the event, type DELETE on the admin page to remove photos, or RESET to clear scores and rounds while keeping the roster.

Phones poll every 3 seconds. The live board is `/board`.
