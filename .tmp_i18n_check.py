import json, re
from pathlib import Path
root = Path('frontend')

en = json.loads((root / 'locales' / 'en.json').read_text(encoding='utf-8'))
el = json.loads((root / 'locales' / 'el.json').read_text(encoding='utf-8'))

def collect_keys(obj, prefix=''):
    keys = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_prefix = (prefix + '.' + k) if prefix else k
            keys.extend(collect_keys(v, new_prefix))
    else:
        keys.append(prefix)
    return keys

keys_en = set(collect_keys(en))
keys_el = set(collect_keys(el))
all_keys = keys_en | keys_el

key_pattern = re.compile(r"\bt\(\s*(['\"])([^'\"\n]+)\1\s*(?:,|\))")
key_template_pattern = re.compile(r"\bt\(\s*`([^`\n]+)`\s*(?:,|\))")

used = set()
for path in root.rglob('*'):
    if path.is_dir():
        continue
    if path.suffix.lower() not in {'.ts', '.tsx', '.js', '.jsx'}:
        continue
    if 'locales' in path.parts:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    for m in key_pattern.finditer(text):
        used.add(m.group(2))
    for m in key_template_pattern.finditer(text):
        used.add(m.group(1))

unused = sorted(k for k in all_keys if k not in used)
print('TOTAL_KEYS', len(all_keys))
print('USED_KEYS', len(used))
print('UNUSED_KEYS', len(unused))
print('---')
print('\n'.join(unused))
