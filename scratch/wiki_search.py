import urllib.request
import urllib.parse
import re
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

searches = [
    'site:commons.wikimedia.org person street smartphone looking at phone',
    'site:commons.wikimedia.org person walking street using mobile phone',
    'site:commons.wikimedia.org tourist looking at phone street city'
]

os.makedirs('scratch/wiki_cands', exist_ok=True)
urls = []

for s in searches:
    ddg_url = f'https://html.duckduckgo.com/html/?q={urllib.parse.quote(s)}'
    req = urllib.request.Request(ddg_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            # Extract wikimedia File links
            found = re.findall(r'commons\.wikimedia\.org/wiki/(File:[^\"]+)', html)
            for f in found:
                clean_f = urllib.parse.unquote(f).split('&')[0].split('"')[0]
                if clean_f not in urls:
                    urls.append(clean_f)
    except Exception as e:
        print(f'Error searching {s}: {e}')

print(f'Found {len(urls)} Wikimedia Commons file pages:', urls[:10])

# For each file page, get the direct image URL (upload.wikimedia.org)
for file_page in urls[:10]:
    page_url = f'https://commons.wikimedia.org/wiki/{urllib.parse.quote(file_page)}'
    preq = urllib.request.Request(page_url, headers=headers)
    try:
        with urllib.request.urlopen(preq) as presp:
            phtml = presp.read().decode('utf-8')
            img_matches = re.findall(r'https://upload\.wikimedia\.org/wikipedia/commons/[a-f0-9]/[a-f0-9]{2}/[^\"]+', phtml)
            if img_matches:
                img_url = img_matches[0]
                # sanitize
                img_url = img_url.split('"')[0].split("'")[0]
                fname = file_page.replace('File:', '').replace('/', '_')
                target = f'scratch/wiki_cands/{fname}'
                ireq = urllib.request.Request(img_url, headers=headers)
                with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
                    f.write(iresp.read())
                print(f'Downloaded {fname}')
    except Exception as e:
        print(f'Failed {file_page}: {e}')
