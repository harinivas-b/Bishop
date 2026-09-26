import urllib.request
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

urls = {
    'cand_dublin': 'https://images.unsplash.com/photo-1772233129847-fc299d5656a0?q=80&w=1000&auto=format&fit=crop',
    'cand_mexico': 'https://images.unsplash.com/photo-1709056842165-20d5f72064b0?q=80&w=1000&auto=format&fit=crop',
    'cand_singapore': 'https://images.unsplash.com/photo-1770184429008-f9f66f5bffe5?q=80&w=1000&auto=format&fit=crop',
    'cand_budapest': 'https://images.unsplash.com/photo-1697287923001-8d6a97e0e5c6?q=80&w=1000&auto=format&fit=crop',
    'cand_sidewalk1': 'https://images.unsplash.com/photo-1679071470638-48d8b9090432?q=80&w=1000&auto=format&fit=crop',
    'cand_sidewalk2': 'https://images.unsplash.com/photo-1653697076368-961751b558ee?q=80&w=1000&auto=format&fit=crop',
}

os.makedirs('scratch/search_cands3', exist_ok=True)

for name, url in urls.items():
    target = f'scratch/search_cands3/{name}.jpg'
    try:
        ireq = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(ireq) as iresp, open(target, 'wb') as f:
            f.write(iresp.read())
        print(f'Downloaded {name}')
    except Exception as e:
        print(f'Failed {name}: {e}')
