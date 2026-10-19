// Renders the PWA icons from brand/icon.svg, the single source of the symbol. Run with `pnpm --filter @easy-grades/web icons`
// and commit the PNGs. The output is deterministic, so a changed PNG always means a changed symbol.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/icons');
// The maskable and apple icons are square and edge to edge, so their background is the symbol's own gradient.
const BRAND_BACKGROUND = 'url(#brand-pen)';

const source = readFileSync(resolve(root, 'brand/icon.svg'), 'utf8');
// Everything between the outer <svg> tags, so the symbol can be placed inside another canvas.
const symbol = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const defs = symbol.match(/<defs>[\s\S]*?<\/defs>/)[0];
// The grid alone: over a full-bleed canvas the symbol's rounded background would restart the gradient and leave a seam.
const grid = symbol.replace(defs, '').replace(/<rect width="512" height="512"[^>]*\/>/, '');

function svgCanvas(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`;
}

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

// The <defs> go before the background because resvg does not resolve a gradient defined after its use in every version.
const fullBleed = `${defs}<rect width="512" height="512" fill="${BRAND_BACKGROUND}"/>`;

// Maskable icons are cropped to a circle of 80% of the canvas, so the grid sits inside that safe zone.
const maskableSvg = svgCanvas(`${fullBleed}<g transform="translate(51.2 51.2) scale(0.8)">${grid}</g>`);

// Apple crops the corners itself, so the touch icon is a full-bleed square with no transparent pixels.
const appleSvg = svgCanvas(`${fullBleed}${grid}`);

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
