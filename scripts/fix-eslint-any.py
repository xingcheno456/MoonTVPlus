import os
import re

ROOT = r'e:\Users\zhao\Documents\GitHub\MoonTV\MoonTVPlus'

FILES = [
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
]

for rel_path in FILES:
    abs_path = os.path.join(ROOT, rel_path)
    if not os.path.exists(abs_path):
        print(f'SKIP (not found): {rel_path}')
        continue

    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    result = []

    for i, line in enumerate(lines):
        trimmed = line.strip()

        # Remove file-level eslint-disable
        if trimmed == '/* eslint-disable @typescript-eslint/no-explicit-any */':
            continue

        # Check if current line has `: any` or `as any`
        has_any = bool(re.search(r'[:\s]any\b', trimmed)) or bool(re.search(r'\bas any\b', trimmed))

        # Check if previous output line is already an eslint-disable comment
        prev_line = result[-1].strip() if result else ''
        prev_is_disable = prev_line.startswith('// eslint-disable-next-line @typescript-eslint/no-explicit-any')

        # Don't add double comments
        if has_any and not prev_is_disable and not trimmed.startswith('// eslint-disable-next-line') and not trimmed.startswith('/* eslint-disable'):
            indent = re.match(r'^(\s*)', line).group(1) if re.match(r'^(\s*)', line) else ''
            result.append(f'{indent}// eslint-disable-next-line @typescript-eslint/no-explicit-any')

        result.append(line)

    new_content = '\n'.join(result)
    if new_content != content:
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'FIXED: {rel_path}')
    else:
        print(f'UNCHANGED: {rel_path}')

print('\nDone!')
