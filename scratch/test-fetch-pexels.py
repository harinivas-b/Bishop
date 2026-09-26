import urllib.request

candidates = [
    ("px_100", "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg?auto=compress&cs=tinysrgb&w=800"),
    ("px_101", "https://images.pexels.com/photos/3771092/pexels-photo-3771092.jpeg?auto=compress&cs=tinysrgb&w=800"),
    ("px_102", "https://images.pexels.com/photos/2923156/pexels-photo-2923156.jpeg?auto=compress&cs=tinysrgb&w=800"),
    ("px_103", "https://images.pexels.com/photos/1462636/pexels-photo-1462636.jpeg?auto=compress&cs=tinysrgb&w=800"),
    ("px_104", "https://images.pexels.com/photos/3184340/pexels-photo-3184340.jpeg?auto=compress&cs=tinysrgb&w=800"),
]

for name, url in candidates:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(f'public/hero/{name}.jpg', 'wb') as f:
            f.write(resp.read())
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Error {name}: {e}")
