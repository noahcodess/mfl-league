// The named commissioner windows. "Desk" = his second monitor (private info + controls); "Stage" = what he screen shares.
// Draft ones exist now; the Game ones come with the games.
export const WINDOWS = {
  draftDesk: { hash: '#draft-desk', name: 'mfl-draft-desk', title: 'Commissioner Window: Draft Desk' },
  draftStage: { hash: '#draft-stage', name: 'mfl-draft-stage', title: 'Commissioner Window: Draft Stage' },
  gameDesk: { hash: '#game-desk', name: 'mfl-game-desk', title: 'Commissioner Window: Game Desk' },
  gameStage: { hash: '#game-stage', name: 'mfl-game-stage', title: 'Commissioner Window: Game Stage' },
};

// The Broadcast Booth for one game (its controls drive the broadcast in the main window).
export const openGameBooth = (gameId) => openWindow({ hash: `#game-booth-${gameId}`, name: `mfl-booth-${gameId}` });

// Opens one in its own small browser window (about half the screen, not a tab, not full screen) to drag onto another monitor.
export function openWindow(key) {
  const win = typeof key === 'string' ? WINDOWS[key] : key;
  const w = Math.round((window.screen.availWidth || 1440) / 2);
  const h = Math.round((window.screen.availHeight || 900) * 0.8);
  const opened = window.open(`${window.location.href.split('#')[0]}${win.hash}`, win.name, `width=${w},height=${h},left=40,top=40,resizable=yes,scrollbars=yes`);
  try { opened?.resizeTo(w, h); } catch { /* the browser decides */ }
}
