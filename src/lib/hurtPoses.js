// The five ways a hurt player lies on the field, each in two frames so his chest heaves (heavy breathing): flat on his back
// with his knee pulled up and both hands on it, face down reaching back for the hamstring, sitting up holding his ankle,
// on his back with both hands on his helmet, and curled up on his back clutching his shoulder. Built as side-view rig
// poses (fieldRig) and laid down by fieldSprite: -90 on his back, 90 face down.
import { POSES } from './fieldRig.js';

const P = (...a) => a;
POSES.hurtKnee = [P(-6, 96, 126, 90, 118, 124, -42, 4, -2), P(-2, 100, 130, 94, 122, 120, -44, 4, -2)];
POSES.hurtHam = [P(4, -34, -8, 24, 52, 2, -104, 0, 0), P(8, -30, -4, 26, 56, 4, -98, 0, 0)];
POSES.hurtAnkle = [P(76, 8, 14, 16, 8, 38, -32, 4, 0), P(82, 12, 18, 20, 12, 40, -30, 4, 0)];
POSES.hurtHead = [P(-6, 138, 232, 148, 244, 58, -12, 6, 2), P(-2, 142, 236, 152, 248, 54, -14, 6, 2)];
POSES.hurtShoulder = [P(14, 58, 162, 22, 34, 72, -12, 56, -24), P(18, 62, 166, 24, 36, 70, -14, 54, -26)];

// How each one is laid down (degrees, times his facing).
export const HURT_TURN = { hurtKnee: -90, hurtHam: 90, hurtAnkle: -90, hurtHead: -90, hurtShoulder: -90 };

// Which one for where it hurts (injuryTypes part).
const BY_PART = { knee: 'hurtKnee', hamstring: 'hurtHam', thigh: 'hurtHam', calf: 'hurtHam', ankle: 'hurtAnkle', head: 'hurtHead', shoulder: 'hurtShoulder', arm: 'hurtShoulder', ribs: 'hurtShoulder', back: 'hurtShoulder', hip: 'hurtKnee' };
export const hurtPose = (part) => BY_PART[part] || 'hurtKnee';
