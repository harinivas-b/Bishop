import os
from PIL import Image

hero_dir = r"e:\Bishop1-fix2\Bishop1\public\hero"

# Target files used on landing page
target_images = {
    "biriyani.png": {"max_dim": 800, "out": "biriyani.webp"},
    "cake.png": {"max_dim": 800, "out": "cake.webp"},
    "filtercoffee.png": {"max_dim": 800, "out": "filtercoffee.webp"},
    "parotta.png": {"max_dim": 800, "out": "parotta.webp"},
    "meals.png": {"max_dim": 800, "out": "meals.webp"},
    "puff.png": {"max_dim": 800, "out": "puff.webp"},
    "tea.png": {"max_dim": 800, "out": "tea.webp"},
    "noodles.png": {"max_dim": 800, "out": "noodles.webp"},
    "croissant.png": {"max_dim": 800, "out": "croissant.webp"},
    "friedrice.png": {"max_dim": 800, "out": "friedrice.webp"},
    "hot-bev.png": {"max_dim": 800, "out": "hot-bev.webp"},
    "cold-bev.png": {"max_dim": 800, "out": "cold-bev.webp"},
    "customer.jpg": {"max_dim": 1000, "out": "customer.webp"},
    "shop.jpg": {"max_dim": 1000, "out": "shop.webp"},
}

for src_name, config in target_images.items():
    src_path = os.path.join(hero_dir, src_name)
    out_path = os.path.join(hero_dir, config["out"])
    if not os.path.exists(src_path):
        print(f"Skipping missing file: {src_name}")
        continue
    
    with Image.open(src_path) as img:
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.mode else "RGB")
        
        orig_w, orig_h = img.size
        max_d = config["max_dim"]
        if max(orig_w, orig_h) > max_d:
            img.thumbnail((max_d, max_d), Image.Resampling.LANCZOS)
        
        img.save(out_path, "WEBP", quality=85, optimize=True)
        src_kb = os.path.getsize(src_path) / 1024
        out_kb = os.path.getsize(out_path) / 1024
        saved_pct = ((src_kb - out_kb) / src_kb) * 100
        print(f"Converted {src_name} ({src_kb:.1f} KB) -> {config['out']} ({out_kb:.1f} KB) [{saved_pct:.1f}% saved]")
