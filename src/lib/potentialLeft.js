// Whether a player still has potential worth showing: once he has reached it (now, or at his peak before slipping:
// the red part of his stars already shows that), it's never shown next to him again. pot: his potential (or null).
export const potentialLeft = (player, pot) => pot != null && pot > Math.max(player?.stars || 0, player?.peakStars || 0);
