// Accounts allowed into the vault. Override with a comma-separated
// NEXT_PUBLIC_ALLOWED_EMAILS at build time; the server re-checks every request,
// so the client copy is only for a friendly redirect.
const DEFAULT_ALLOWED = 'pokharelsandeep333@gmail.com';

const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || DEFAULT_ALLOWED)
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const isAllowedEmail = (email?: string | null): boolean =>
  !!email && ALLOWED_EMAILS.includes(email.toLowerCase());
