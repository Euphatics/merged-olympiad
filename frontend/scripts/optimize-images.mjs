/**
 * Generates WebP alongside every sizeable PNG/JPEG in public/.
 *
 *   npm run optimize:images
 *
 * Originals are kept and referenced as the <picture> fallback, so nothing
 * breaks for a client that cannot decode WebP. Re-running is cheap: a WebP that
 * is already newer than its source is skipped.
 *
 * This is a deliberate build-time step rather than part of `vite build` — the
 * source images change rarely, and re-encoding several hundred kilobytes on
 * every deploy would be wasted work.
 */
import sharp from 'sharp';
import { readdir, stat, utimes } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Below this, the WebP saving rarely justifies a second request path. */
const MIN_BYTES = 20 * 1024;
const QUALITY = 82;

/** Widest a full-bleed banner ever renders; larger is wasted pixels. */
const MAX_WIDTH = 1920;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(0)} kB`;
}

const results = { converted: 0, skipped: 0, savedBytes: 0 };

for await (const file of walk(publicDir)) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

  const source = await stat(file);
  if (source.size < MIN_BYTES) continue;

  const target = file.replace(/\.(png|jpe?g)$/i, '.webp');

  if (existsSync(target)) {
    const existing = await stat(target);
    if (existing.mtimeMs >= source.mtimeMs) {
      results.skipped += 1;
      continue;
    }
  }

  const image = sharp(file);
  const { width } = await image.metadata();

  await image
    .resize({ width: Math.min(width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(target);

  const output = await stat(target);

  // Keep mtime ordering stable so the skip check above stays reliable.
  await utimes(target, new Date(), new Date());

  const saved = source.size - output.size;
  results.converted += 1;
  results.savedBytes += saved;

  const rel = path.relative(publicDir, file).replace(/\\/g, '/');
  const pct = ((saved / source.size) * 100).toFixed(0);
  console.log(`  ${rel}  ${formatKb(source.size)} → ${formatKb(output.size)}  (-${pct}%)`);
}

console.log(
  `\n${results.converted} converted, ${results.skipped} already current. ` +
    `Saved ${formatKb(results.savedBytes)}.`
);
