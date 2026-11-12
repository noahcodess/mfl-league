import React, { useEffect } from 'react';
import { useInbox, MAIL_ICON } from '../data/inbox.js';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { decideNumber } from '../data/coaches.js';
import { decideJersey } from '../data/jerseys.js';
import UniformSprite from '../components/UniformSprite.jsx';
import DripRequestPreview from '../components/DripRequestPreview.jsx';
import { decideDrip } from '../data/drip.js';
import EndZoneRequest from '../components/EndZoneRequest.jsx';
import { decideEndZone } from '../data/endZones.js';
import { links } from '../lib/router.js';
import { shortDate } from '../lib/format.js';

// Your inbox: trade offers and answers, trade block alerts, league news. The commissioner also gets every coach edit (View coach)
// and drip, number, jersey and end zone change requests (Accept / Decline, with before and after pictures).
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
              {m.kind === 'jersey_request' && m.data?.colors && <span className="mail-jersey"><UniformSprite colors={m.data.colors} scale={2} /></span>}
              {m.kind === 'drip_request' && m.data?.after && <DripRequestPreview data={m.data} />}
              {m.kind === 'endzone_request' && m.data?.team && <EndZoneRequest data={m.data} />}
              <small className="dim">{shortDate(m.createdAt)}{m.toCommish ? ' · commissioner notice' : ''}</small>
            </div>
            {m.kind.startsWith('trade') && <a className="btn small ghost" href={links.trades}>Open trades</a>}
            {m.kind === 'coach_edit' && m.data?.team && <a className="btn small ghost" href={links.team(m.data.team)}>View coach</a>}
            {m.kind === 'jersey_request' && m.data?.request && (
              <span className="mail-btns">
                <ConfirmButton className="btn small good" label="Approve" title={`Approve the ${m.data.name} jersey?`} yes="Approve" text="It becomes the team's uniform right away." onConfirm={() => decideJersey(m.data.request, true, m.data.team)} />
                <ConfirmButton className="btn small ghost" label="Deny" title="Deny this jersey change?" yes="Deny" onConfirm={() => decideJersey(m.data.request, false, m.data.team)} />
              </span>
            )}
            {m.kind === 'drip_request' && m.data?.request && (
              <span className="mail-btns">
                <ConfirmButton className="btn small good" label="Accept" title={`Accept this ${String(m.data.item).toLowerCase()} change?`} yes="Accept" text="It goes on right away, and he waits 2 weeks before his next change." onConfirm={() => decideDrip(m.data.request, true)} />
                <ConfirmButton className="btn small ghost" label="Decline" title="Decline this drip change?" yes="Decline" onConfirm={() => decideDrip(m.data.request, false)} />
              </span>
            )}
            {m.kind === 'endzone_request' && m.data?.request && (
              <span className="mail-btns">
                <ConfirmButton className="btn small good" label="Approve" title="Approve these end zones?" yes="Approve" text="They're painted on the field right away." onConfirm={() => decideEndZone(m.data.request, true)} />
                <ConfirmButton className="btn small ghost" label="Deny" title="Deny this end zone change?" yes="Deny" onConfirm={() => decideEndZone(m.data.request, false)} />
              </span>
            )}
            {m.kind === 'number_request' && m.data?.request && (
              <span className="mail-btns">
                <ConfirmButton className="btn small good" label="Approve" title="Approve this number change?" yes="Approve" onConfirm={() => decideNumber(m.data.request, true)} />
                <ConfirmButton className="btn small ghost" label="Deny" title="Deny this number change?" yes="Deny" onConfirm={() => decideNumber(m.data.request, false)} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
