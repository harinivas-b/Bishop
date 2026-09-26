import urllib.request
import urllib.parse
import re
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'}

searches = [
    'site:unsplash.com/photos person street smartphone looking at phone',
    'site:unsplash.com/photos tourist city map phone walking',
    'site:unsplash.com/photos man walking street holding phone looking',
    'site:unsplash.com/photos woman street smartphone searching location'
]

os.makedirs('scratch/ddg_cands', exist_ok=True)

photo_ids = []

for s in searches:
    url = f'https://html.duckduckgo.com/html/?q={urllib.parse.quote(s)}'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            # Extract unsplash photo slugs/IDs
            found = re.findall(r'unsplash\.com/photos/([a-zA-Z0-9_-]+)', html)
            for f in found:
                if f not in photo_ids and len(f) > 5 and not f.startswith('search'):
                    photo_ids.append(f)
    except Exception as e:
        print(f'Error searching {s}: {e}')

print(f'Found {len(photo_ids)} photo IDs:', photo_ids)

for pid in photo_ids:
    target = f'scratch/ddg_cands/{pid}.jpg'
    img_url = f'https://images.unsplash.com/photo-{pid}?q=80&w=1000&auto=format&fit=crop'
    try:
        ireq = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
            f.write(iresp.read())
        print(f'Downloaded {pid}')
    except Exception as e:
        print(f'Failed {pid}: {e}')
