"""
Icon generation script for Session Saver Chrome Extension.
Creates crisp 16x16, 48x48, and 128x128 PNG icons using Pillow.
"""
from PIL import Image, ImageDraw
import os

def create_icon(size):
    # Render at 4x resolution for anti-aliasing, then downsample
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Padding and rounded squircle background
    pad = int(canvas_size * 0.06)
    radius = int(canvas_size * 0.22)
    
    # Gradient background: Top-left #4338CA (Indigo 700) to Bottom-right #6366F1 (Indigo 500)
    bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    bg_draw.rounded_rectangle(
        [pad, pad, canvas_size - pad, canvas_size - pad],
        radius=radius,
        fill=(79, 70, 229, 255) # Indigo 600
    )

    # Add gradient overlay
    for y in range(pad, canvas_size - pad):
        factor = (y - pad) / (canvas_size - 2 * pad)
        r = int(67 + factor * 35)   # 67 -> 102
        g = int(56 + factor * 45)   # 56 -> 101
        b = int(202 + factor * 40)  # 202 -> 242
        # Apply line mask to rounded rect
        line_img = Image.new("RGBA", (canvas_size, 1), (r, g, b, 255))
        bg.paste(line_img, (0, y), mask=bg.crop((0, y, canvas_size, y + 1)))

    img = Image.alpha_composite(img, bg)
    draw = ImageDraw.Draw(img)

    # Inner illustration: Layered Tabs / Windows with a Bookmark Save ribbon
    # Tab 1 (back tab)
    t1_x0 = int(canvas_size * 0.22)
    t1_y0 = int(canvas_size * 0.20)
    t1_x1 = int(canvas_size * 0.70)
    t1_y1 = int(canvas_size * 0.40)
    t1_rad = int(canvas_size * 0.06)
    draw.rounded_rectangle(
        [t1_x0, t1_y0, t1_x1, t1_y1],
        radius=t1_rad,
        fill=(199, 210, 254, 180) # Indigo 200 with opacity
    )

    # Main window / active tab card
    w_x0 = int(canvas_size * 0.18)
    w_y0 = int(canvas_size * 0.30)
    w_x1 = int(canvas_size * 0.82)
    w_y1 = int(canvas_size * 0.80)
    w_rad = int(canvas_size * 0.08)
    
    # White card background with slight shadow
    draw.rounded_rectangle(
        [w_x0, w_y0, w_x1, w_y1],
        radius=w_rad,
        fill=(255, 255, 255, 255)
    )

    # Window header bar
    header_h = int(canvas_size * 0.12)
    draw.rounded_rectangle(
        [w_x0, w_y0, w_x1, w_y0 + header_h],
        radius=w_rad,
        fill=(238, 242, 255, 255) # Indigo 50
    )
    # Square bottom edges of the header bar
    draw.rectangle(
        [w_x0, w_y0 + header_h - w_rad, w_x1, w_y0 + header_h],
        fill=(238, 242, 255, 255)
    )

    # 3 mini dots in the window header (like browser window controls)
    dot_y = w_y0 + header_h // 2
    dot_r = max(2, int(canvas_size * 0.02))
    dot_spacing = int(canvas_size * 0.055)
    dot_start_x = w_x0 + int(canvas_size * 0.06)
    draw.ellipse([dot_start_x - dot_r, dot_y - dot_r, dot_start_x + dot_r, dot_y + dot_r], fill=(244, 63, 94, 230)) # Red
    draw.ellipse([dot_start_x + dot_spacing - dot_r, dot_y - dot_r, dot_start_x + dot_spacing + dot_r, dot_y + dot_r], fill=(245, 158, 11, 230)) # Amber
    draw.ellipse([dot_start_x + dot_spacing * 2 - dot_r, dot_y - dot_r, dot_start_x + dot_spacing * 2 + dot_r, dot_y + dot_r], fill=(16, 185, 129, 230)) # Emerald

    # Simulated tab rows in the body
    row_x0 = w_x0 + int(canvas_size * 0.08)
    row_x1 = w_x1 - int(canvas_size * 0.08)
    row_h = int(canvas_size * 0.045)
    row_gap = int(canvas_size * 0.04)
    r1_y = w_y0 + header_h + int(canvas_size * 0.06)
    r2_y = r1_y + row_h + row_gap
    r3_y = r2_y + row_h + row_gap

    draw.rounded_rectangle([row_x0, r1_y, row_x1, r1_y + row_h], radius=row_h//2, fill=(224, 231, 255, 255))
    draw.rounded_rectangle([row_x0, r2_y, int(row_x0 + (row_x1 - row_x0) * 0.75), r2_y + row_h], radius=row_h//2, fill=(224, 231, 255, 255))
    draw.rounded_rectangle([row_x0, r3_y, int(row_x0 + (row_x1 - row_x0) * 0.55), r3_y + row_h], radius=row_h//2, fill=(224, 231, 255, 255))

    # A prominent bookmark/save badge in the bottom-right corner
    bm_w = int(canvas_size * 0.22)
    bm_h = int(canvas_size * 0.28)
    bm_x0 = canvas_size - pad - bm_w
    bm_y0 = canvas_size - pad - bm_h - int(canvas_size * 0.02)
    bm_x1 = canvas_size - pad
    bm_y1 = canvas_size - pad - int(canvas_size * 0.02)
    
    # Draw bookmark polygon
    notch_h = int(bm_h * 0.3)
    points = [
        (bm_x0, bm_y0),
        (bm_x1, bm_y0),
        (bm_x1, bm_y1),
        ((bm_x0 + bm_x1) // 2, bm_y1 - notch_h),
        (bm_x0, bm_y1)
    ]
    draw.polygon(points, fill=(16, 185, 129, 255)) # Emerald 500 save ribbon
    
    # Downsample with high-quality LANCZOS filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    os.makedirs("src/icons", exist_ok=True)
    for size in (16, 48, 128):
        icon = create_icon(size)
        path = f"src/icons/icon{size}.png"
        icon.save(path, "PNG")
        print(f"Generated {path} ({size}x{size})")

if __name__ == "__main__":
    main()
