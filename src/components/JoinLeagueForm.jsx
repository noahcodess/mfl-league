import React, { useState } from 'react';
import Field from './Field.jsx';
import { checkPasscode, joinLeague } from '../data/joinLeague.js';
import { signIn, PASSWORD_MIN } from '../data/session.js';

// First time here: enter the commissioner's one-time passcode, then make your own username and password.
export default function JoinLeagueForm() {
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState(null);
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (work) => {
    setBusy(true);
    setError('');
    try { await work(); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const check = (e) => { e.preventDefault(); run(async () => setInvite(await checkPasscode(code))); };
  const join = (e) => {
    e.preventDefault();
    if (pass !== again) return setError("Those two passwords don't match");
    return run(async () => {
      const r = await joinLeague(code, username, pass);
      await signIn(r.username, pass);
    });
  };

  if (!invite) {
    return (
      <form onSubmit={check}>
        <div className="join-welcome">
          <b>Welcome in.</b>
          <p>You must have the commissioner's permission to join. Enter the one-time passcode he sent you. You only enter it this one time, to log in for the first time and create your account.</p>
        </div>
        <Field id="join-code" label="One-time passcode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX"
          autoComplete="one-time-code" autoCapitalize="characters" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy || code.replace(/[^A-Z0-9]/gi, '').length < 12}>{busy ? 'Checking...' : 'Continue'}</button>
      </form>
    );
  }
  return (
    <form onSubmit={join}>
      <div className="join-welcome ok">
        <b>Welcome, Coach {invite.coachName}!</b>
        <p>You're the new coach of the <b>{invite.teamName}</b>. Now make your own login. From now on you'll log in with this username and password, not the passcode. Nobody else can see your password, not even the commissioner.</p>
      </div>
      <Field id="join-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
        hint="3 to 20 characters: lowercase letters, numbers or _" autoComplete="username" autoCapitalize="none" required />
      <Field id="join-pass" label="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} hint={`At least ${PASSWORD_MIN} characters`} autoComplete="new-password" required />
      <Field id="join-pass-2" label="Type it again" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required />
      {error && <div className="form-error">{error}</div>}
      <button className="btn wide" disabled={busy}>{busy ? 'Creating your account...' : 'Create my account'}</button>
    </form>
  );
}
