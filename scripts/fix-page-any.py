import os
import re

ROOT = r'e:\Users\zhao\Documents\GitHub\MoonTV\MoonTVPlus'

FILES = [
    'src/components/VideoCard.tsx',
    'src/app/admin/page.tsx',
    'src/app/play/page.tsx',
    'src/app/page.tsx',
    'src/app/search/page.tsx',
    'src/app/private-library/page.tsx',
    'src/app/music/page.tsx',
    'src/app/douban/page.tsx',
    'src/components/UserMenu.tsx',
    'src/app/login/page.tsx',
    'src/app/register/page.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/player/LyricsPiPWindow.tsx',
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
    any_count = 0

    for i, line in enumerate(lines):
        trimmed = line.strip()

        # Handle file-level eslint-disable
        # Pattern 1: /* eslint-disable @typescript-eslint/no-explicit-any */
        # Pattern 2: /* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
        # Pattern 3: /* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
        
        if trimmed.startswith('/* eslint-disable') and '@typescript-eslint/no-explicit-any' in trimmed:
            # Remove only the @typescript-eslint/no-explicit-any rule
            remaining = trimmed.replace('/* eslint-disable', '').replace('*/', '')
            rules = [r.strip() for r in remaining.split(',')]
            rules = [r for r in rules if r != '@typescript-eslint/no-explicit-any']
            
            if len(rules) == 0:
                # No rules left, skip this line entirely
                continue
            else:
                # Keep other rules
                result.append(f'/* eslint-disable {", ".join(rules)} */')
            continue

        # Check if current line has `: any` or `as any`
        has_any = bool(re.search(r'[:\s]any\b', trimmed)) or bool(re.search(r'\bas any\b', trimmed))
        
        # But skip lines that are already eslint comments
        if trimmed.startswith('// eslint-disable-next-line') or trimmed.startswith('/* eslint-disable'):
            has_any = False

        # Check if previous output line is already an eslint-disable comment
        prev_line = result[-1].strip() if result else ''
        prev_is_disable = prev_line.startswith('// eslint-disable-next-line @typescript-eslint/no-explicit-any')

        if has_any and not prev_is_disable:
            indent = re.match(r'^(\s*)', line).group(1) if re.match(r'^(\s*)', line) else ''
            result.append(f'{indent}// eslint-disable-next-line @typescript-eslint/no-explicit-any')
            any_count += 1

        result.append(line)

    new_content = '\n'.join(result)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'FIXED: {rel_path} ({any_count} inline disables added)')

print('\nDone!')
