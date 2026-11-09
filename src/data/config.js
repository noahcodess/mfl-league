// Connection details for the league database. Both values are public by design; the security rules protect the data.
export const SUPABASE_URL = 'https://vnhgocmjwmnqwfuiypby.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_HkNvphnu4t67qKLkZ_IU3Q_sPnRMlOO';

// Supabase logins need an email, so each username quietly becomes one. Coaches never see this.
export const EMAIL_DOMAIN = 'accounts.mfl-league.com';
export const emailFor = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
