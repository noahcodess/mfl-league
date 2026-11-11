// Checks a team logo upload: must be a PNG with a see-through background. Shrinks it to fit 512x512 and returns
// { blob, preview } ready to upload, or throws a plain-English reason.
export async function prepareLogo(file) {
  if (!file) throw new Error('Pick a file first');
  if (file.type !== 'image/png') throw new Error('The logo has to be a PNG file');
  if (file.size > 8 * 1024 * 1024) throw new Error('That file is too big (8 MB max)');
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("That PNG couldn't be opened"));
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 512 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 16) clear += 1;
  const alpha = (x, y) => data[(y * w + x) * 4 + 3];
  const clearCorners = [alpha(0, 0), alpha(w - 1, 0), alpha(0, h - 1), alpha(w - 1, h - 1)].filter((a) => a < 16).length;
  if (clear / (w * h) < 0.03 || clearCorners < 2) {
    throw new Error('The logo needs a see-through (transparent) background. Remove the background and save it as a PNG.');
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, preview: canvas.toDataURL('image/png') };
}
