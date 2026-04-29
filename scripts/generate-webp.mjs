// scripts/generate-webp.mjs
// Converts all JPEG/JPG media files to WebP at quality 85.
// Run automatically as part of prebuild. Uses mtime to skip up-to-date files.

import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = resolve(__dirname, '..', 'src', 'content');
const QUALITY = 85;

async function findJpegs(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findJpegs(fullPath)));
    } else if (/\.(jpg|jpeg)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function isUpToDate(srcPath, outPath) {
  try {
    const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)]);
    return outStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    return false;
  }
}

const jpegs = await findJpegs(CONTENT_ROOT);
let converted = 0;
let skipped = 0;
let failed = 0;

await Promise.all(
  jpegs.map(async (srcPath) => {
    const ext = extname(srcPath);
    const outPath = srcPath.slice(0, -ext.length) + '.webp';
    if (await isUpToDate(srcPath, outPath)) {
      skipped++;
      return;
    }
    try {
      await sharp(srcPath).webp({ quality: QUALITY }).toFile(outPath);
      converted++;
    } catch (err) {
      console.error(`Failed to convert ${srcPath}:`, err.message);
      failed++;
    }
  })
);

console.log(
  `WebP generation: ${converted} converted, ${skipped} skipped, ${failed} failed (${jpegs.length} total)`
);
