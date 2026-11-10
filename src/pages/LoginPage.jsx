import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import { signIn, setViewAs } from '../data/session.js';

// Username and password login. TEMPORARY: a Coach / Commissioner (testing) switch while test mode is on.
export default function LoginPage({ notice }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [as, setAs] = useState('coach');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setViewAs(as === 'commish' ? 'commissioner' : null);
      await signIn(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard title={as === 'coach' ? 'Coach Login' : 'Commissioner Login'} sub={as === 'coach' ? 'Use the username and temporary password the commissioner sent you. Your team is already set up and waiting.' : 'Testing only: the site owner logs in with his own account and sees the site as the commissioner.'}>
      <div className="seg login-as">
        <button type="button" className={as === 'coach' ? 'on' : ''} onClick={() => setAs('coach')}>Log in as coach</button>
        <button type="button" className={as === 'commish' ? 'on' : ''} onClick={() => setAs('commish')}>Log in as commissioner</button>
      </div>
      {notice && <div className="form-error">{notice}</div>}
      <form onSubmit={submit}>
        <Field id="login-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        <Field id="login-pass" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      {as === 'coach' && <ol className="login-steps">
        <li>The commissioner gives you a username and a temporary password (usually by Discord DM).</li>
        <li>Log in with them. You'll pick your own password right away.</li>
        <li>You land on your team. Forgot your password? Ask the commissioner to reset it.</li>
      </ol>}
    </AuthCard>
  );
}
