// How many real screen pixels wide a full-screen broadcast shot is on this device. Pixel-art shots size their canvases from
// this so every art pixel lands on whole screen pixels and nothing shimmers when the camera creeps.
export const shotPixels = () => Math.min(window.innerWidth, (window.innerHeight * 16) / 9) * (window.devicePixelRatio || 1);
