import React from 'react';
import { inSandbox } from '../data/sandbox.js';

// Shown to everyone while the commissioner is testing: nothing on the site is real right now.
export default function SandboxBanner() {
  if (!inSandbox()) return null;
  return <div className="sandbox-banner">🧪 TEST MODE · Nothing here is real. When the commissioner leaves TEST mode, the league resets.</div>;
}
