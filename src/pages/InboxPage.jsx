import React, { useEffect } from 'react';
import { useInbox, MAIL_ICON } from '../data/inbox.js';
import { links } from '../lib/router.js';
import { shortDate } from '../lib/format.js';

// Your inbox: trade offers and answers, trade block alerts, league news, and (for the commissioner) league notices.
export default function InboxPage({ viewer }) {
  const { mail, lastRead, markAllRead } = useInbox(viewer?.user_id);
  useEffect(() => {
    if (!mail.length) return undefined;
    const t = setTimeout(markAllRead, 1500);
    return () => clearTimeout(t);
  }, [mail.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="inbox-page">
      <div className="page-head"><h1>Inbox</h1></div>
      {!mail.length && <p className="dim">Nothing here yet. Trade offers, trade block alerts and league news show up here.</p>}
      <ul className="mail">
        {mail.map((m) => (
          <li key={m.id} className={m.id > lastRead ? 'new' : ''}>
            <span className="mail-icon">{MAIL_ICON[m.kind] || '📨'}</span>
            <div className="mail-body">
              <b>{m.title}</b>
              {m.body && <p>{m.body}</p>}
              <small className="dim">{shortDate(m.createdAt)}{m.toCommish ? ' · commissioner notice' : ''}</small>
            </div>
            {m.kind.startsWith('trade') && <a className="btn small ghost" href={links.trades}>Open trades</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
