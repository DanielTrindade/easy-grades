import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const iconsDir = resolve(webRoot, 'public/icons');

type Image = { width: number; height: number; data: Buffer };
type Pixel = [number, number, number, number];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PEN_TOP = [0x46, 0x77, 0xee];
const PEN_BOTTOM = [0x1f, 0x47, 0xb4];

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw: Buffer, width: number, height: number): Buffer {
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw.readUInt8(offset);
    offset += 1;
    for (let x = 0; x < stride; x += 1) {
      const value = raw.readUInt8(offset);
      offset += 1;
      const a = x >= 4 ? data.readUInt8(y * stride + x - 4) : 0;
      const b = y > 0 ? data.readUInt8((y - 1) * stride + x) : 0;
      const c = x >= 4 && y > 0 ? data.readUInt8((y - 1) * stride + x - 4) : 0;
      const above =
        filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : paeth(a, b, c);
      data.writeUInt8((value + above) & 0xff, y * stride + x);
    }
  }
  return data;
}

function decodePng(name: string): Image {
  const png = readFileSync(resolve(iconsDir, name));
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${name} is not a PNG`);
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    const chunk = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      expect([chunk.readUInt8(8), chunk.readUInt8(9), chunk.readUInt8(12)]).toEqual([8, 6, 0]);
    }
    if (type === 'IDAT') idat.push(chunk);
    offset += 12 + length;
  }
  return { width, height, data: unfilter(inflateSync(Buffer.concat(idat)), width, height) };
}

const decoded = new Map<string, Image>();
function image(name: string): Image {
  const cached = decoded.get(name);
  if (cached) return cached;
  const decodedImage = decodePng(name);
  decoded.set(name, decodedImage);
  return decodedImage;
}

function pixelAt({ width, data }: Image, x: number, y: number): Pixel {
  const offset = (y * width + x) * 4;
  return [data.readUInt8(offset), data.readUInt8(offset + 1), data.readUInt8(offset + 2), data.readUInt8(offset + 3)];
}

function penBackgroundAt(y: number, height: number): number[] {
  const t = (y + 0.5) / height;
  return PEN_TOP.map((channel, index) => channel + (PEN_BOTTOM[index]! - channel) * t);
}

function backgroundDelta(pixel: Pixel, y: number, height: number): number {
  return Math.max(...penBackgroundAt(y, height).map((channel, index) => Math.abs(pixel[index]! - channel)));
}

function alphaRange({ data }: Image): { min: number; max: number } {
  let min = 255;
  let max = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    const alpha = data.readUInt8(offset);
    min = Math.min(min, alpha);
    max = Math.max(max, alpha);
  }
  return { min, max };
}

describe('generated brand icons', () => {
  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['maskable-512.png', 512],
    ['apple-touch-icon-180.png', 180],
  ])('%s decodes as a square RGBA image of %ipx', (name, size) => {
    expect(image(name)).toMatchObject({ width: size, height: size });
  });

  it('ships the favicon as a byte-for-byte copy of brand/icon.svg', () => {
    expect(readFileSync(resolve(webRoot, 'public/favicon.svg'))).toEqual(readFileSync(resolve(webRoot, 'brand/icon.svg')));
  });

  it('keeps the corners of the normal icons transparent and draws the pen grid', () => {
    for (const name of ['icon-192.png', 'icon-512.png']) {
      const icon = image(name);
      const { width, height } = icon;
      for (const [x, y] of [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ]) {
        expect(pixelAt(icon, x!, y!)[3], `${name} at ${x},${y}`).toBe(0);
      }
      expect(pixelAt(icon, width / 2, 0)[3], `${name} top center`).toBe(255);
    }
    const icon = image('icon-512.png');
    expect(backgroundDelta(pixelAt(icon, 256, 20), 20, 512), 'icon-512.png background').toBeLessThanOrEqual(1);
    expect(pixelAt(icon, 124, 124), 'icon-512.png first done cell').toEqual([255, 255, 255, 255]);
  });

  it('paints the maskable background as one full-bleed pen gradient, without a seam', () => {
    const maskable = image('maskable-512.png');
    expect(alphaRange(maskable)).toEqual({ min: 255, max: 255 });
    for (let y = 0; y < 512; y += 1) {
      expect(backgroundDelta(pixelAt(maskable, 100, y), y, 512), `maskable-512.png at y=${y}`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every maskable grid pixel inside the 80% safe circle', () => {
    const maskable = image('maskable-512.png');
    let inkPixels = 0;
    let farthest = 0;
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 512; x += 1) {
        const pixel = pixelAt(maskable, x, y);
        if (backgroundDelta(pixel, y, 512) <= 3) continue;
        inkPixels += 1;
        farthest = Math.max(farthest, Math.hypot(x + 0.5 - 256, y + 0.5 - 256));
      }
    }
    expect(inkPixels).toBeGreaterThan(40000);
    expect(farthest).toBeGreaterThan(195);
    expect(farthest).toBeLessThanOrEqual(204.8);
  });

  it('keeps the apple touch icon fully opaque on the same pen gradient', () => {
    const apple = image('apple-touch-icon-180.png');
    expect(alphaRange(apple)).toEqual({ min: 255, max: 255 });
    expect(backgroundDelta(pixelAt(apple, 90, 0), 0, 180), 'apple-touch-icon-180.png at y=0').toBeLessThanOrEqual(1);
  });
});
