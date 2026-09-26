#!/usr/bin/env node
/**
 * Upload the paid editions to the private Supabase Storage bucket that
 * api/download.js signs URLs from.
 *
 * Paid PDFs and EPUBs are not in the public repository. Run this from a
 * machine that has the release files — or pass --from-git <ref> to read them
 * out of a commit from before they were removed (218df4a is the last one).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node tools/upload_private_library.mjs --dir ./release
 *   SUPABASE_SERVICE_ROLE_KEY=... node tools/upload_private_library.mjs --from-git 218df4a
 *
 * Every file is checked against assets/library/SHA256SUMS.txt before upload.
 * The bucket is created private if it does not exist. Nothing here ever makes
 * the bucket or an object public.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'assets/library/catalog.json'), 'utf8'));
const sums = new Map(
  readFileSync(path.join(ROOT, 'assets/library/SHA256SUMS.txt'), 'utf8')
    .split('\n').filter(Boolean).map((line) => line.split(/\s+/)).map(([sha, rel]) => [rel, sha]),
);

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};
const dir = option('--dir');
const gitRef = option('--from-git');
const dryRun = args.includes('--dry-run');

const url = (process.env.SUPABASE_URL || 'https://zfpjgedcjdhxvdbthikt.supabase.co').replace(/\/+$/, '');
const bucket = process.env.LIBRARY_BUCKET || 'library-private';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!dir && !gitRef) || (!key && !dryRun)) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... node tools/upload_private_library.mjs (--dir DIR | --from-git REF) [--dry-run]');
  process.exit(2);
}

const paidKeys = catalog.titles.flatMap((title) => ['pdf', 'epub']
  .map((format) => title[format])
  .filter((edition) => edition && edition.access === 'paid')
  .map((edition) => edition.storageKey));

function readEdition(objectKey) {
  if (dir) return readFileSync(path.join(dir, objectKey));
  return execFileSync('git', ['show', `${gitRef}:assets/library/${objectKey}`], {
    cwd: ROOT, maxBuffer: 64 * 1024 * 1024,
  });
}

const headers = { Authorization: `Bearer ${key}`, apikey: key };

async function ensurePrivateBucket() {
  const existing = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers });
  if (existing.ok) {
    const info = await existing.json();
    if (info.public) throw new Error(`Bucket ${bucket} is public. Make it private before uploading paid editions.`);
    return;
  }
  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  });
  if (!created.ok) throw new Error(`Could not create bucket ${bucket}: HTTP ${created.status}`);
}

const contentType = (objectKey) => (objectKey.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip');

async function main() {
  if (!dryRun) await ensurePrivateBucket();
  for (const objectKey of paidKeys) {
    const bytes = readEdition(objectKey);
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha !== sums.get(objectKey)) throw new Error(`${objectKey}: checksum does not match SHA256SUMS.txt`);
    if (dryRun) {
      console.log(`ok   ${objectKey} (${bytes.length} bytes)`);
      continue;
    }
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectKey}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType(objectKey), 'x-upsert': 'true' },
      body: bytes,
    });
    if (!response.ok) throw new Error(`${objectKey}: upload failed with HTTP ${response.status}`);
    console.log(`sent ${objectKey} (${bytes.length} bytes)`);
  }
  console.log(`${paidKeys.length} paid editions ${dryRun ? 'verified' : `uploaded to private bucket ${bucket}`}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
