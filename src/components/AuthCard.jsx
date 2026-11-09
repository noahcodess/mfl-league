import React from 'react';
import { leagueLogo } from '../data/logos.js';

// The centered pixel panel every login step uses: MFL logo, title, a line of help, then the form.
export default function AuthCard({ step, title, sub, wide, children }) {
  return (
    <div className="auth-wrap">
      <div className={`auth-card${wide ? ' wide' : ''}`}>
        <img className="auth-logo" src={leagueLogo.light} alt="MFL" />
        {step && <div><span className="auth-step">{step}</span></div>}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}
