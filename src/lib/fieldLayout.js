// The game world in pixels, shared by the field, the stands, the camera and (soon) the players: 8 pixels to a yard.
// The world is the whole stadium floor: front rows of the stands, the wall, the sideline apron, the white border and the field.
export const YD = 8;
export const FX0 = 80, FY0 = 120;            // top-left corner of the field (back of the left end zone, far sideline)
export const FW = 120 * YD, FH = 427;         // 100 yards + two 10-yard end zones, 53 1/3 yards wide
export const FX1 = FX0 + FW, FY1 = FY0 + FH;
export const WORLD_W = FX1 + 80, WORLD_H = FY1 + 73;
export const VIEW_W = 640, VIEW_H = 360;      // what the game camera shows
export const BORDER = 16, WALL_TOP = 52, WALL_BOTTOM = FY1 + 38, WALL_LEFT = 26, WALL_RIGHT = WORLD_W - 34;

// World x of a yard line: 0 is the left goal line, 50 is midfield, 100 is the right goal line.
export const yardX = (yd) => FX0 + (10 + yd) * YD;
export const MID_Y = FY0 + FH / 2;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
// A crisp rectangle painter for a canvas context.
export const brush = (ctx) => (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
