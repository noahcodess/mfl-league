// The ball-carrier ring, like Madden: a ring on the grass around whoever has the ball, with "F. LAST" bending along its
// lower edge. It moves to the receiver just before a catchable ball gets to him (and to a returner as the kick comes down),
// and once a defender makes the play (the tackle, the sack, the breakup) it moves to him. Each move fades in over half
// a second. Drawn on the broadcast canvas: the ring under the players, the name on top so nobody hides it.

// Who wears the ring right now, or null.
export function focusOf(S) {
  const t = S.t, b = S.ball, f = b.flight;
  if (S.star && t >= S.star.at && !S.star.a.gone) return S.star.a;          // the defender who made the play
  if (f?.to && t >= Math.max(f.t0, f.t1 - 0.7)) return f.to;               // right before it gets to him
  if (b.holder) return (S.lastHolder = b.holder);
  return f && !b.kick ? S.lastHolder || null : null;                         // a pass in the air: still on the passer until then
}

const nameOf = (a) => { const [first = '', ...rest] = (a.p?.name || '').split(' '); return `${first ? `${first[0]}. ` : ''}${a.p?.last || rest.join(' ') || first}`.toUpperCase(); };

// How strong the ring is (0 to 1): it fades in whenever it moves to someone new.
function fadeFor(S, a) {
  const r = (S.ringFx ||= { id: null, at: 0 });
  if (r.id !== a.id) { r.id = a.id; r.at = S.t; }
  return Math.max(0, Math.min(1, (S.t - r.at) / 0.5));
}

// v: { sx, sy, px, yd } from sceneDraw. looks: { playerId: look } (for his team color). Returns the label to draw after the players.
export function drawRing(ctx, S, v, looks) {
  const a = focusOf(S); if (!a) { if (S.ringFx) S.ringFx.id = null; return null; }
  const k = fadeFor(S, a), cx = v.sx(a.x), cy = v.sy(a.y), rx = 1.15 * v.yd * v.px, ry = rx * 0.42, col = looks[a.id]?.colors?.jersey || '#ffffff';
  ctx.save(); ctx.globalAlpha = 0.9 * k;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(2, 2.4 * v.px); ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx + v.px, ry + v.px * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, 1.1 * v.px); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, cy, rx - v.px * 0.6, ry - v.px * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  return () => label(ctx, nameOf(a), cx, cy, rx + 2.2 * v.px, ry + 1.6 * v.px, Math.max(10, Math.round(5.6 * v.px)), k);
}

// The name bending along the bottom of the ring, left to right, each letter turned to follow the curve.
function label(ctx, text, cx, cy, rx, ry, size, k) {
  ctx.save(); ctx.globalAlpha = k; ctx.font = `800 ${size}px 'Barlow Condensed', 'Arial Narrow', sans-serif`; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size * 0.22); ctx.strokeStyle = 'rgba(8,10,14,0.9)'; ctx.fillStyle = '#ffffff';
  const widths = [...text].map((ch) => ctx.measureText(ch).width + size * 0.04), arc = (p) => Math.hypot(rx * Math.sin(p), ry * Math.cos(p));
  let phi = Math.PI / 2 + widths.reduce((s, w) => s + w, 0) / 2 / arc(Math.PI / 2);   // start on the left so it's centered under him
  [...text].forEach((ch, i) => {
    phi -= widths[i] / 2 / arc(phi);
    const x = cx + rx * Math.cos(phi), y = cy + ry * Math.sin(phi), ang = Math.atan2(-ry * Math.cos(phi), rx * Math.sin(phi));
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeText(ch, 0, 0); ctx.fillText(ch, 0, 0); ctx.restore();
    phi -= widths[i] / 2 / arc(phi);
  });
  ctx.restore();
}
