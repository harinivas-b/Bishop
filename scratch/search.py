import urllib.request
import re
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

queries = [
    'https://unsplash.com/s/photos/person-street-phone',
    'https://unsplash.com/s/photos/woman-walking-street-phone',
    'https://unsplash.com/s/photos/man-walking-street-phone',
    'https://unsplash.com/s/photos/city-map-phone-person',
    'https://unsplash.com/s/photos/tourist-phone-city-street'
]

os.makedirs('scratch/unsplash_street', exist_ok=True)
downloaded = 0

for url in queries:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            # Extract image src urls from unsplash images.unsplash.com
            srcs = re.findall(r'https://images\.unsplash\.com/photo-([a-zA-Z0-9_-]+)\?', html)
            srcs = list(dict.fromkeys(srcs))
            print(f'Found {len(srcs)} photo IDs for {url}')
            for pid in srcs[:10]:
                img_url = f'https://images.unsplash.com/photo-{pid}?q=80&w=1000&auto=format&fit=crop'
                target = f'scratch/unsplash_street/{pid}.jpg'
                if not os.path.exists(target):
                    try:
                        ireq = urllib.request.Request(img_url, headers=headers)
                        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
                            f.write(iresp.read())
                        print(f'Downloaded {pid}')
                        downloaded += 1
                    except Exception as e:
                        print(f'Failed {pid}: {e}')
    except Exception as e:
        print(f'Error fetching {url}: {e}')

print(f'Total downloaded: {downloaded}')
