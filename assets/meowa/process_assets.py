from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
SOURCE = next((ROOT / "source" / "asset-sheet-run").rglob("ui_output.png"))
OUT = ROOT / "selected"
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SOURCE).convert("RGBA")
boxes = {
    "hero-lightcraft.png": (43, 114, 490, 537),
    "hazard-a.png": (556, 81, 737, 444),
    "hazard-b.png": (838, 82, 1046, 441),
    "hazard-c.png": (1113, 81, 1445, 444),
    "shield.png": (837, 518, 1071, 790),
    "light-shard.png": (515, 530, 760, 780),
    "speed-boost.png": (1224, 555, 1440, 775),
    "hud-sound.png": (110, 854, 307, 1049),
    "hud-pause.png": (354, 853, 549, 1050),
    "hud-shard.png": (596, 854, 790, 1049),
    "hud-shield.png": (840, 855, 1032, 1048),
    "hud-left.png": (1092, 858, 1241, 1047),
    "hud-right.png": (1330, 858, 1480, 1048),
}

for name, box in boxes.items():
    im.crop(box).save(OUT / name)


def fit(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = img.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    return copy


def glow(asset: Image.Image, radius: int, color: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", asset.size)
    layer.paste(color, mask=asset.getchannel("A"))
    return layer.filter(ImageFilter.GaussianBlur(radius))


hazards = [Image.open(OUT / f"hazard-{c}.png").convert("RGBA") for c in "abc"]
hazard_family = Image.new("RGBA", (900, 400))
x = 20
for asset in hazards:
    part = fit(asset, (260, 360))
    hazard_family.alpha_composite(part, (x + (260 - part.width) // 2, (400 - part.height) // 2))
    x += 290
hazard_family.save(OUT / "hazard-family.png")

hero = Image.open(OUT / "hero-lightcraft.png").convert("RGBA")
icon = Image.new("RGBA", (512, 512), "#05081A")
pix = icon.load()
for y in range(512):
    for x in range(512):
        dx, dy = x - 256, y - 250
        aurora = max(0.0, 1.0 - (dx * dx / 90000 + dy * dy / 120000))
        pix[x, y] = (5 + int(12 * aurora), 8 + int(45 * aurora), 26 + int(90 * aurora), 255)
hero_i = fit(hero, (390, 390))
g = glow(hero_i, 24, (102, 227, 255, 180))
pos = ((512 - hero_i.width) // 2, (512 - hero_i.height) // 2 + 10)
icon.alpha_composite(g, pos)
icon.alpha_composite(hero_i, pos)
icon.save(OUT / "app-icon-512.png")

cover = Image.new("RGBA", (1200, 630), "#05081A")
d = ImageDraw.Draw(cover)
for y in range(630):
    t = y / 629
    d.line((0, y, 1200, y), fill=(5 + int(12 * (1-t)), 8 + int(30 * (1-t)), 26 + int(75 * (1-t)), 255))
# Aurora lanes and dawn portal are controlled post-processing, not generated 3D models.
d.ellipse((830, 40, 1180, 390), outline="#FFD76A", width=18)
d.ellipse((875, 85, 1135, 345), outline="#FFF3B0", width=5)
for x in (260, 600, 940):
    d.line((600, 620, x, 245), fill=(35, 93, 145, 150), width=4)
hero_c = fit(hero, (460, 430))
pos_h = (390, 190)
cover.alpha_composite(glow(hero_c, 28, (102, 227, 255, 160)), pos_h)
cover.alpha_composite(hero_c, pos_h)
for asset, pos, max_size in [
    (Image.open(OUT / "hazard-a.png").convert("RGBA"), (120, 205), (140, 250)),
    (Image.open(OUT / "hazard-c.png").convert("RGBA"), (890, 245), (150, 250)),
    (Image.open(OUT / "light-shard.png").convert("RGBA"), (710, 165), (130, 130)),
]:
    part = fit(asset, max_size)
    cover.alpha_composite(glow(part, 14, (255, 215, 106, 130)), pos)
    cover.alpha_composite(part, pos)
font_paths = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
font_path = next((p for p in font_paths if Path(p).exists()), None)
title_font = ImageFont.truetype(font_path, 64) if font_path else ImageFont.load_default()
body_font = ImageFont.truetype(font_path, 27) if font_path else ImageFont.load_default()
d.text((58, 45), "LINH QUANG: VƯỢT BÃO", font=title_font, fill="#F4F8FF", stroke_width=2, stroke_fill="#11265B")
d.text((62, 119), "Thu Mảnh Sáng • Né Mảnh Vỡ • Vượt qua bình minh", font=body_font, fill="#FFD76A")
cover.convert("RGB").save(OUT / "gamehub-cover-1200x630.png")

contact = Image.new("RGB", (1800, 1500), "#05081A")
cd = ImageDraw.Draw(contact)
head = ImageFont.truetype(font_path, 38) if font_path else ImageFont.load_default()
label = ImageFont.truetype(font_path, 24) if font_path else ImageFont.load_default()
cd.text((45, 30), "BABYLON PILOT • MEOWA SELECTED ASSETS", font=head, fill="#F4F8FF")
sheet = fit(im, (1050, 780))
contact.paste(Image.new("RGB", (sheet.width + 12, sheet.height + 12), "#11265B"), (39, 94))
contact.paste(sheet, (45, 100), sheet)
cd.text((45, 100 + sheet.height + 10), "SOURCE SHEET • job_aff52e9d3a46447fbafaff06da954197", font=label, fill="#A9B8D8")
cover_preview = fit(Image.open(OUT / "gamehub-cover-1200x630.png"), (650, 360))
contact.paste(cover_preview, (1110, 110))
cd.text((1110, 480), "GAMEHUB COVER • 1200×630", font=label, fill="#FFD76A")
icon_preview = fit(Image.open(OUT / "app-icon-512.png"), (330, 330))
contact.paste(icon_preview, (1270, 550), icon_preview)
cd.text((1270, 895), "APP ICON • 512×512", font=label, fill="#66E3FF")
items = [
    ("hero-lightcraft.png", "PLAYER / VEHICLE"),
    ("hazard-family.png", "HAZARD FAMILY"),
    ("light-shard.png", "COLLECTIBLE"),
    ("shield.png", "SHIELD"),
    ("speed-boost.png", "BOOST (REFERENCE ONLY)"),
    ("hud-shard.png", "HUD MOTIF"),
]
for i, (name, caption) in enumerate(items):
    col, row = i % 6, i // 6
    x, y = 45 + col * 290, 1030 + row * 360
    asset = fit(Image.open(OUT / name).convert("RGBA"), (240, 230))
    tile = Image.new("RGBA", (260, 250), "#11265B")
    tile.alpha_composite(asset, ((260 - asset.width) // 2, (250 - asset.height) // 2))
    contact.paste(tile.convert("RGB"), (x, y))
    cd.text((x, y + 265), caption, font=label, fill="#F4F8FF")
contact.save(ROOT / "contact-sheet.png")
