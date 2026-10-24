// Recovery credentials stay in memory; never persist or log email-link secrets.
export function parseRecoveryLink(href) {
  const url = new URL(href);
  const hashQuery = new URLSearchParams(url.hash.split('?')[1] || '');
  const get = (key) => url.searchParams.get(key) || hashQuery.get(key);
  const userId = get('userId');
  const secret = get('secret');
  return { requested: get('passwordRecovery') === '1' || Boolean(userId || secret),
    credentials: userId && secret ? { userId, secret } : null };
}
let credentials = null;
export function prepareRecoveryLocation(location, history) {
  const parsed = parseRecoveryLink(location.href);
  if (!parsed.requested) return;
  credentials = parsed.credentials;
  const clean = new URL(location.href);
  for (const key of ['passwordRecovery', 'userId', 'secret', 'expire']) clean.searchParams.delete(key);
  clean.hash = '/reset-password';
  history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
}
export function getRecoveryCredentials() { return credentials; }
export function clearRecoveryCredentials() { credentials = null; }
export function recoveryRedirect(href) {
  const url = new URL(href);
  url.search = '?passwordRecovery=1';
  url.hash = '';
  return url.href;
}
export function validateRecoveryPassword(password, confirmation) {
  if (password.length < 8 || password.length > 256) return 'Use between 8 and 256 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}
export function createPasswordRecovery(account) {
  return {
    async requestPasswordReset(email, url) {
      try { await account.createRecovery({ email: email.trim(), url }); return { error: null }; }
      catch (error) {
        // Keep unknown-address responses indistinguishable from delivery.
        if (error.type === 'user_not_found') return { error: null };
        return { error: { message: error.code === 429 ? 'Too many requests. Please wait before trying again.' : 'Could not send the reset email. Please try again shortly.' } };
      }
    },
    async resetPassword(token, password) {
      if (!token?.userId || !token?.secret) return { error: { message: 'This reset link is incomplete. Request a new one.' } };
      try { await account.updateRecovery({ userId: token.userId, secret: token.secret, password }); return { error: null }; }
      catch (error) { return { error: { message: error.code === 429 ? 'Too many attempts. Please wait before trying again.' : error.code === 401 || error.code === 404 ? 'This reset link has expired or has already been used. Request a new one.' : 'Could not update your password. Please try again, or request a new link.' } }; }
    },
  };
}
