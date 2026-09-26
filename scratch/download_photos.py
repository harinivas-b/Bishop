import urllib.request
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

photo_ids = [
    'photo-1534536281715-e28d76689b4d',
    'photo-1492562080023-ab3db95bfbce',
    'photo-1508214751196-bcfd4ca60f91',
    'photo-1499714608240-22fc6ad53fb2',
    'photo-1517841905240-472988babdf9',
    'photo-1520975916090-3105956dac38',
    'photo-1516726817505-f5ed825624d8',
    'photo-1568602471122-7832951cc4c5',
    'photo-1501196354995-cbb51c65aaea',
    'photo-1485217988980-11786ced9454',
    'photo-1521119989659-a83eee488004',
    'photo-1534751516642-a171e261f524',
    'photo-1544717305-2782549b5136',
    'photo-1517486808906-6ca8b3f04846',
    'photo-1520607162513-77705c0f0d4a',
    'photo-1512428559087-560fa5ceab42',
    'photo-1522071820081-009f0129c71c',
    'photo-1506794778202-cad84cf45f1d',
    'photo-1539571696357-5a69c17a67c6'
]

os.makedirs('scratch/photo_cands', exist_ok=True)

for pid in photo_ids:
    target = f'scratch/photo_cands/{pid}.jpg'
    img_url = f'https://images.unsplash.com/{pid}?q=80&w=1000&auto=format&fit=crop'
    try:
        ireq = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
            f.write(iresp.read())
        print(f'Downloaded {pid}')
    except Exception as e:
        print(f'Failed {pid}: {e}')
