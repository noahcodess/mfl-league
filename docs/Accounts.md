# Accounts and the commissioner key

How logins work on the MFL site, and what to do when something goes wrong.

## Coaches
- Every coach has a username and password. Usernames are 3 to 20 characters: lowercase letters, numbers or `_`.
- The commissioner creates coach accounts in the commissioner console. The site shows a temporary password **once**; he passes it to the coach (DM on Discord).
- At first login the coach must pick their own password. After that, nobody can see it, the commissioner included.
- Forgot password: the commissioner hits Reset. A new temporary password is shown once, and the coach picks a new one at next login.
- One coach per team. The commissioner can move a coach to another team or remove the account.

## Commissioner
- Username `sserg`. His starting password is temporary and must be changed at first login.
- On first login the site makes the **commissioner key** in his browser: 24 characters mixing capital letters, numbers and symbols. It's shown once. He saves it somewhere private (a password manager or a locked note).
- Only a scrambled (bcrypt) version of the key is stored. Nobody can read it back, including the site owner.
- Every commissioner session needs password **and** key. Entering the key unlocks commissioner powers for 12 hours. 5 wrong tries locks the key for 15 minutes.
- Without the key entered, the commissioner account can't change anything, including coach accounts.

## If the commissioner loses his key
The site owner runs this in the Supabase SQL editor:

```sql
delete from public.commish_key;
delete from public.commish_unlocks;
```

Next time Sergio logs in, the site makes him a new key. The old one stops working right away.

## How it's built
- `supabase/migrations/002_accounts.sql`: the profiles and key tables.
- `supabase/migrations/003_security.sql`: who can read and change what, and the key functions.
- `supabase/functions/admin-accounts/`: the account manager (create, reset, move, remove). It refuses anyone who isn't the commissioner with his key entered.
- Usernames become emails like `name@accounts.mfl-league.com` behind the scenes, because Supabase logins need an email. Coaches never see this.
- Public signups must stay **off** in Supabase (Authentication → Sign In / Providers → turn off "Allow new users to sign up"). Only the commissioner creates accounts.
