import urllib.request

urls = {
    "u1": "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&auto=format&fit=crop",
    "u2": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop",
    "u3": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop",
    "u4": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop",
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(f'public/hero/{name}.jpg', 'wb') as f:
            f.write(resp.read())
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Error {name}: {e}")
