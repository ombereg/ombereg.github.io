from pathlib import Path
from PIL import Image
import re, hashlib, base64

root = Path('assets/projects')
page = Path('index.html')
original = page.read_text()
raw = page.read_bytes()
git_hash = lambda b: hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
assert git_hash(raw) == '0eb19b12e46a3f1422f6a69aef0ddb60e95024a9', 'Source page changed; review the new version before applying.'

# Validate transport integrity before creating any published image.
for name, expected in [('branding', 'dab714f53c2f734e48e3dd647c0de9baf4c0bc16'), ('holidays', '26ce74455f3806dd294e53504487b16ed2583bc2')]:
    payload = Path('.planet-build/' + name + '.transport').read_bytes()
    if name == 'branding' and git_hash(payload) == '1af246930adee6a7264b006a18644e5bf63414bf':
        encoded = base64.b64encode(payload).decode('ascii')
        fragment = 'BeTHL24yQC+jbIc8G'
        assert encoded.count(fragment + fragment) == 1
        repaired = encoded.replace(fragment + fragment, fragment, 1)
        repaired += '=' * (-len(repaired) % 4)
        payload = base64.b64decode(repaired, validate=True)
    assert git_hash(payload) == expected, (name, 'Image integrity check failed')
    (root / (name + '-v5.webp')).write_bytes(payload)

items = [
    ('omuseum', 'OMuseum', 'omuseum-v4', 320),
    ('seaversum', 'Seaversum', 'seaversum-v4', 320),
    ('brux', 'Brux', 'brax-v4', 320),
    ('nadopenarts', 'Nadopen Arts', 'nadopenarts-v4', 320),
    ('soullux', 'Soul Lux', 'soullux-v4', 320),
    ('holidays', 'Holidays', 'holidays-v5', 256),
    ('branding', 'Branding', 'branding-v5', 256),
]
for name in ['branding', 'holidays']:
    img = Image.open(root / (name + '-v5.webp')).convert('RGBA')
    assert img.size == (256, 256)
    assert img.getchannel('A').getextrema() == (0, 255)
    img.save(root / (name + '-v5.png'), optimize=True)

parts = ['      <div class="about-visual project-universe" aria-label="Projects">']
for key, label, asset, size in items:
    parts.extend([
        f'        <button class="project-planet planet-{key}" type="button" data-project="{label}" data-image="assets/projects/{asset}.png" aria-haspopup="dialog" aria-controls="project-modal">',
        f'          <span class="project-planet-art"><picture><source type="image/webp" srcset="assets/projects/{asset}.webp"><img src="assets/projects/{asset}.png" width="{size}" height="{size}" alt="" loading="lazy" decoding="async"></picture></span>',
        f'          <span class="project-planet-name">{label}</span>',
        '        </button>',
    ])
parts.append('      </div>')
pattern = r'      <div class="about-visual project-universe"[\s\S]*?      </div>'
html, n = re.subn(pattern, '\n'.join(parts), original, count=1)
assert n == 1
html = html.replace('href="assets/projects/planets-v4.css"', 'href="assets/projects/planets-v5.css"')
html = html.replace('/* Project planet layout is in assets/projects/planets-v4.css. */', '/* Project planet layout is in assets/projects/planets-v5.css. */')

# Scope guard: no changes outside the planets HTML and its stylesheet reference.
normal = lambda text: re.sub(pattern, '<!-- PLANETS -->', text).replace('planets-v5.css', 'planets-v4.css')
assert normal(html) == normal(original)
for attr in ('data-project=', 'class="project-planet '):
    assert html.count(attr) == 7, attr
for _, _, asset, _ in items:
    assert (root / (asset + '.png')).exists()
    assert (root / (asset + '.webp')).exists()
page.write_text(html)
print('PREPARED: seven distinct planets with Nadopen Arts at the center; original galleries and scripts preserved.')
for path in [page, root/'planets-v5.css', root/'branding-v5.webp', root/'holidays-v5.webp', root/'branding-v5.png', root/'holidays-v5.png']:
    print('FILE', str(path), 'SHA', git_hash(path.read_bytes()), 'BYTES', path.stat().st_size)
