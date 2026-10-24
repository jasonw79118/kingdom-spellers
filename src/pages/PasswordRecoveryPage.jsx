import { useState } from 'react';
import { Link } from 'react-router-dom';
import { backend, backendMode } from '../lib/backend';
import { getRecoveryCredentials, clearRecoveryCredentials, recoveryRedirect, validateRecoveryPassword } from '../lib/passwordRecovery';

export default function PasswordRecoveryPage({ reset = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const token = getRecoveryCredentials();
  const supported = backendMode === 'appwrite';
  const canSubmit = supported && (!reset || Boolean(token));
  async function submit(event) {
    event.preventDefault();
    if (busy || !canSubmit) return;
    setError('');
    if (reset) {
      const invalid = validateRecoveryPassword(password, confirmation);
      if (invalid) { setError(invalid); return; }
    }
    setBusy(true);
    try {
      const result = reset
        ? await backend.auth.resetPassword(token, password)
        : await backend.auth.requestPasswordReset(email, recoveryRedirect(window.location.href));
      if (result.error) setError(result.error.message);
      else {
        if (reset) { clearRecoveryCredentials(); setPassword(''); setConfirmation(''); }
        setDone(true);
      }
    } catch { setError('Could not connect. Please try again shortly.'); }
    finally { setBusy(false); }
  }
  return <main className="ks-center" style={{ minHeight: '100vh', padding: '32px 16px' }}>
    <div className="card ks-stack" style={{ width: '100%', maxWidth: 440 }}>
      <p className="ks-muted" style={{ margin: 0 }}>Kingdom Spellers</p>
      <h1 style={{ margin: 0 }}>{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
      {done ? <p role="status">{reset ? 'Your password has been updated. Sign in with your new password.' : 'If an account exists for that email, a reset link will arrive shortly. Check your inbox and spam folder. The link expires after one hour.'}</p>
        : !supported ? <p role="status">{backendMode === 'demo' ? 'Email password recovery is unavailable in this local demo. Use the live Kingdom Spellers site to reset your online account.' : 'Email password recovery is currently available for Appwrite accounts. Contact your site administrator for help with this account.'}</p>
        : reset && !token ? <p role="alert">This reset link is missing or incomplete. Request a new email and open its link to choose your password.</p>
        : <form className="ks-stack" onSubmit={submit}>
          {reset ? <>
            <p className="ks-muted">Use 8 to 256 characters. Your children and their progress will be preserved.</p>
            <div className="field"><label className="label" htmlFor="new-password">New password</label><input className="input" id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required value={password} onChange={e => setPassword(e.target.value)} /></div>
            <div className="field"><label className="label" htmlFor="confirm-password">Confirm new password</label><input className="input" id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
          </> : <>
            <p className="ks-muted">Enter the parent account email and we will send a link to reset your password.</p>
            <div className="field"><label className="label" htmlFor="recovery-email">Email</label><input className="input" id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          </>}
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : reset ? 'Update password' : 'Send reset link'}</button>
        </form>}
      {reset && !done && <Link to="/forgot-password">Request a new reset link</Link>}
      <Link to="/login">Back to sign in</Link>
    </div>
  </main>;
}
