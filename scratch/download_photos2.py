import urllib.request
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

photo_ids = [
    'photo-1526778548025-fa2f459cd5c1',
    'photo-1506784983877-45594efa4cbe',
    'photo-1524504388940-b1c1722653e1',
    'photo-1519699047748-de8e457a634e',
    'photo-1580489944761-15a19d654956',
    'photo-1548142813-c348350df52b',
    'photo-1517841905240-472988babdf9',
    'photo-1501196354995-cbb51c65aaea',
    'photo-1573497019940-1c28c88b4f3e',
    'photo-1534528741775-53994a69daeb',
    'photo-1529626455594-4ff0802cfb7e',
    'photo-1560250097-0b93528c311a'
]

os.makedirs('scratch/photo_cands2', exist_ok=True)

for pid in photo_ids:
    target = f'scratch/photo_cands2/{pid}.jpg'
    img_url = f'https://images.unsplash.com/{pid}?q=80&w=1000&auto=format&fit=crop'
    try:
        ireq = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
            f.write(iresp.read())
        print(f'Downloaded {pid}')
    except Exception as e:
        print(f'Failed {pid}: {e}')
