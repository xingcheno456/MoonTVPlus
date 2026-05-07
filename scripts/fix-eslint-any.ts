import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'src/lib/redis-base.db.ts',
  'src/lib/upstash.db.ts',
  'src/lib/postgres.db.ts',
  'src/lib/postgres-adapter.ts',
  'src/lib/d1.db.ts',
  'src/lib/d1-adapter.ts',
  'src/lib/pansou.client.ts',
  'src/lib/netdisk/quark.client.ts',
  'src/lib/special-sources-detail.ts',
  'src/lib/openlist-refresh.ts',
  'src/lib/user-cache.ts',
  'src/lib/anime-subscription.ts',
];

for (const relPath of FILES) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf-8');
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Remove file-level eslint-disable
    if (trimmed === '/* eslint-disable @typescript-eslint/no-explicit-any */') {
      continue;
    }

    // Check if current line has `: any` or `as any`
    const hasAny = /[:\s]any\b/.test(trimmed) || /\bas any\b/.test(trimmed);

    // Check if previous output line is already an eslint-disable comment
    const prevLine = result.length > 0 ? result[result.length - 1].trim() : '';
    const prevIsDisable = prevLine.startsWith('// eslint-disable-next-line @typescript-eslint/no-explicit-any');

    // Don't add double comments
    if (hasAny && !prevIsDisable && !trimmed.startsWith('// eslint-disable-next-line') && !trimmed.startsWith('/* eslint-disable')) {
      // Indent to match the next line
      const indent = line.match(/^(\s*)/)?.[1] || '';
      result.push(`${indent}// eslint-disable-next-line @typescript-eslint/no-explicit-any`);
    }

    result.push(line);
  }

  const newContent = result.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(absPath, newContent, 'utf-8');
    console.log(`FIXED: ${relPath}`);
  } else {
    console.log(`UNCHANGED: ${relPath}`);
  }
}

console.log('\nDone!');
