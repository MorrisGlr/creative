// scripts/generate-og.mjs
// Build-time script: generates the fallback OG image (1200x630 typography card).
// Run via: npm run generate:og   (also runs automatically as prebuild)

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const leagueSpartan = readFileSync(resolve(ROOT, 'src/assets/fonts/LeagueSpartan-Bold.ttf'));
const jost = readFileSync(resolve(ROOT, 'src/assets/fonts/Jost-Bold.ttf'));

const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px',
        backgroundColor: '#000',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Jost',
              fontSize: 72,
              fontWeight: 700,
              color: '#f0f0f0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            },
            children: 'Morris Aguilar',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'League Spartan',
              fontSize: 28,
              fontWeight: 700,
              color: '#a0a0a0',
              marginTop: 24,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            },
            children: 'Photography \u00b7 Sculpture \u00b7 Generative Art \u00b7 Paper',
          },
        },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Jost', data: jost, weight: 700, style: 'normal' },
      { name: 'League Spartan', data: leagueSpartan, weight: 700, style: 'normal' },
    ],
  }
);

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
const png = resvg.render().asPng();
writeFileSync(resolve(ROOT, 'public/og-default.png'), png);
console.log('Generated public/og-default.png (1200x630)');
