// Renders the PWA icons from brand/icon.svg, the single source of the symbol. Run with `pnpm --filter @easy-grades/web icons`
// and commit the PNGs. The output is deterministic, so a changed PNG always means a changed symbol.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/icons');
const BRAND_GRAPHITE = '#18191C';

const source = readFileSync(resolve(root, 'brand/icon.svg'), 'utf8');
// Everything between the outer <svg> tags, so the symbol can be placed inside another canvas.
const symbol = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

function svgCanvas(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`;
}

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

// Maskable icons are cropped to a circle of 80% of the canvas, so the symbol sits inside that safe zone.
const maskableSvg = svgCanvas(
  `<rect width="512" height="512" fill="${BRAND_GRAPHITE}"/><g transform="translate(51.2 51.2) scale(0.8)">${symbol}</g>`,
);

// Apple crops the corners itself, so the touch icon is a full-bleed square with no transparent pixels.
const appleSvg = svgCanvas(`<rect width="512" height="512" fill="${BRAND_GRAPHITE}"/>${symbol}`);

const outputs = {
  'icon-192.png': render(source, 192),
  'icon-512.png': render(source, 512),
  'maskable-512.png': render(maskableSvg, 512),
  'apple-touch-icon-180.png': render(appleSvg, 180),
};

mkdirSync(outDir, { recursive: true });
for (const [name, png] of Object.entries(outputs)) {
  writeFileSync(resolve(outDir, name), png);
  console.log(`wrote public/icons/${name} (${png.length} bytes)`);
}
