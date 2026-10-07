import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const IVORY = [0xf3, 0xed, 0xe2];

const SOFTEN = 0.15;

export function softenTowardIvory(hex: string): string {
  const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `#${c
    .map((v, i) =>
      Math.round(v + (IVORY[i] - v) * SOFTEN)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** Light washi fibres on near-white; multiplied by the material colour, so it reads on any paper colour. */
export function createWashiTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * Math.PI;
    const len = 4 + Math.random() * 18;
    ctx.strokeStyle = `rgba(120, 104, 84, ${0.04 + Math.random() * 0.07})`;
    ctx.lineWidth = 0.4 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.4) * len * 0.5,
      y + Math.sin(a + 0.4) * len * 0.5,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len
    );
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
