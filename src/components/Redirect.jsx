import { useEffect } from 'react';

// Sends the browser to another screen (used after login).
export default function Redirect({ to }) {
  useEffect(() => { window.location.hash = to; }, [to]);
  return null;
}
