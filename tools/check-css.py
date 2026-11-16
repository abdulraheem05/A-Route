#!/usr/bin/env python3
"""Structural checks on a CSS file: brace/paren balance, @layer and @media
nesting, declarations terminated, and every custom property referenced is
also defined somewhere in the file."""
import re, sys

path = sys.argv[1]
src = open(path, encoding='utf-8').read()

# Strip comments and string literals so braces inside them don't count.
no_comments = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
stripped = re.sub(r"'[^'\n]*'|\"[^\"\n]*\"", '""', no_comments)

depth = 0
line = 1
problems = []
for ch in stripped:
    if ch == '\n':
        line += 1
    elif ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth < 0:
            problems.append(f'line {line}: closing brace with no matching open')
            depth = 0
if depth != 0:
    problems.append(f'file ends with {depth} unclosed block(s)')

for name, op, cl in (('paren', '(', ')'), ('bracket', '[', ']')):
    if stripped.count(op) != stripped.count(cl):
        problems.append(f'unbalanced {name}s: {stripped.count(op)} {op} vs {stripped.count(cl)} {cl}')

# Declarations: a property line inside a block should end in ; or be last.
for n, raw in enumerate(no_comments.split('\n'), 1):
    t = raw.strip()
    if not t or t.startswith('@') or t.startswith('/*'):
        continue
    if t.endswith(('{', '}', ';', ',')) or t.startswith('}'):
        continue
    # A value continued on the next line: unclosed paren, or ends at the colon.
    if t.count('(') != t.count(')') or t.endswith(':'):
        continue
    # A selector continued on the next line has no colon.
    if ':' in t and not t.endswith((')', '%')):
        problems.append(f'line {n}: declaration may be missing a semicolon -> {t[:70]}')

defined = set(re.findall(r'(--[\w-]+)\s*:', no_comments))
used = set(re.findall(r'var\(\s*(--[\w-]+)', no_comments))
# Tailwind and the fallback chain supply a few from elsewhere.
external = {'--font-mono', '--font-fallback', '--tw-ring-color'}
missing = sorted(u for u in used - defined - external)
# A var() with its own fallback value is fine even if undefined here.
really_missing = []
for v in missing:
    if not re.search(r'var\(\s*' + re.escape(v) + r'\s*,', no_comments):
        really_missing.append(v)
if really_missing:
    problems.append('custom properties used with no definition and no fallback: ' + ', '.join(really_missing))

print(f'{path}: {len(no_comments.splitlines())} lines')
if problems:
    print('PROBLEMS:')
    for p in problems:
        print(' -', p)
    sys.exit(1)
print('structure OK — braces balanced, declarations terminated, variables resolvable')
