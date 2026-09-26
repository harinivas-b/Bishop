import urllib.request
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

slugs = [
    'rAQpbAB_nBw',
    'SVwXm_hX4Wg',
    'dQYcom0Fjmo',
    'cQac0iv-JBM',
    'L57KpUtXG2U',
    'Inm65A5ZUB8',
    'ZxeujApwctU',
    'hsvIc_Tdukk',
    'q70r_0BWzVY',
    'qQ0nknwjXic'
]

os.makedirs('scratch/ddg_cands', exist_ok=True)

for pid in slugs:
    target = f'scratch/ddg_cands/{pid}.jpg'
    img_url = f'https://unsplash.com/photos/{pid}/download?force=true&w=1000'
    try:
        ireq = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
            f.write(iresp.read())
        print(f'Downloaded {pid}')
    except Exception as e:
        print(f'Failed {pid}: {e}')
