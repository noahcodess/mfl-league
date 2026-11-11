import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import JoinLeagueForm from '../components/JoinLeagueForm.jsx';
import { signIn, setViewAs } from '../data/session.js';

// Login: returning coaches use their own username and password; first-timers join with the commissioner's one-time passcode.
// TEMPORARY: a "commissioner (testing)" switch while test mode is on.
export default function LoginPage({ notice }) {
  const [mode, setMode] = useState('login'); // 'login' | 'join'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [asCommish, setAsCommish] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setViewAs(asCommish ? 'commissioner' : null);
      await signIn(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard title={mode === 'join' ? 'Join the MFL' : asCommish ? 'Commissioner Login' : 'Coach Login'}
      sub={mode === 'join' ? 'New coaches start here.' : asCommish ? 'Testing only: the site owner logs in with his own account and sees the site as the commissioner.' : 'Log in with the username and password you made.'}>
      <div className="seg login-as">
        <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
        <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>First time here</button>
      </div>
      {notice && <div className="form-error">{notice}</div>}
      {mode === 'join' ? <JoinLeagueForm /> : (
        <>
          <form onSubmit={submit}>
            <Field id="login-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
            <Field id="login-pass" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            {error && <div className="form-error">{error}</div>}
            <button className="btn wide" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
          </form>
          <p className="dim help">Forgot your password? Ask the commissioner to reset it. New coach? Tap <b>First time here</b> and use the passcode he sent you.</p>
          <label className="commish-test"><input type="checkbox" checked={asCommish} onChange={(e) => setAsCommish(e.target.checked)} /> Testing: log in as commissioner</label>
        </>
      )}
    </AuthCard>
  );
}
