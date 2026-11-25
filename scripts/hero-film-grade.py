# Usage: python3 scripts/hero-film-grade.py <frames-in> <frames-out> <sweep-start-s> <sweep-end-s> <ray-source-x 0..1>
"""Cinematic grade for the Flow gold film: filmic curve, split tone, gold saturation, bloom,
anamorphic streaks, a light sweep that runs over the metal, depth bokeh dust, vignette and grain."""
import sys, glob, math
import cv2, numpy as np

src, out = sys.argv[1], sys.argv[2]
SW0, SW1, RCX = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
files = sorted(glob.glob(f"{src}/*.png"))
N = len(files)
FPS = 24.0
rng = np.random.default_rng(11)
H, W = cv2.imread(files[0]).shape[:2]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
nx, ny = xx / W, yy / H

# vignette (oval, soft)
d = np.sqrt(((nx - .5) / .62) ** 2 + ((ny - .52) / .58) ** 2)
vignette = np.clip(1 - .7 * np.clip(d - .55, 0, 1) ** 1.6 * 2.2, .35, 1)[..., None]

# dust: three depth layers
layers = []
for count, size, blur, alpha, speed in [(70, 1.6, 0, .9, 10), (40, 4, 3, .55, 22), (14, 16, 9, .28, 40)]:
    layers.append(dict(x=rng.uniform(0, W, count), y=rng.uniform(0, H, count), s=rng.uniform(.6, 1.4, count) * size,
                       ph=rng.uniform(0, 6.28, count), drift=rng.uniform(-.4, .4, count), blur=blur, a=alpha, v=speed))

def smooth(x):
    return x * x * (3 - 2 * x)

for i, f in enumerate(files):
    t = i / FPS
    img = cv2.imread(f).astype(np.float32) / 255.0  # BGR
    b, g, r = img[..., 0], img[..., 1], img[..., 2]
    lum = .0722 * b + .7152 * g + .2126 * r

    # filmic curve: deeper blacks, S contrast
    img = np.clip((img - .025) / .975, 0, 1)
    img = img * .62 + smooth(img) * .38

    # gold saturation boost (hue roughly 20-55 deg)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hue = hsv[..., 0]
    gold = np.clip(1 - np.abs(hue - 38) / 22, 0, 1)
    hsv[..., 1] = np.clip(hsv[..., 1] * (1 + .18 * gold), 0, 1)
    img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    # split tone: maroon shadows, warm gold highlights
    lum = (.0722 * img[..., 0] + .7152 * img[..., 1] + .2126 * img[..., 2])[..., None]
    shadow = np.clip(1 - lum * 2.4, 0, 1)
    high = np.clip((lum - .45) * 1.8, 0, 1)
    img += shadow * np.array([.012, -.004, .028], np.float32)
    img *= 1 + high * np.array([-.10, .02, .07], np.float32)
    img = np.clip(img, 0, 1)

    # light sweep running across the metal between 2.4s and 6.6s
    p = (t - SW0) / (SW1 - SW0)
    if 0 <= p <= 1:
        pos = -.3 + p * 1.6
        band = np.exp(-(((nx * .82 + ny * .45) - pos) / .09) ** 2)[..., None]
        metal = np.clip((lum - .3) * 2, 0, 1) * gold[..., None]
        img = img + band * metal * np.array([.4, .7, .85], np.float32) * 1.0

    # bloom (two radii) and anamorphic streaks from the brightest highlights
    lum = (.0722 * img[..., 0] + .7152 * img[..., 1] + .2126 * img[..., 2])[..., None]
    hi = img * np.clip((lum - .58) / .35, 0, 1)
    bloom = cv2.GaussianBlur(hi, (0, 0), 14) * .55 + cv2.GaussianBlur(hi, (0, 0), 42) * .45
    peak = img * np.clip((lum - .8) / .2, 0, 1)
    streak = cv2.blur(cv2.blur(peak, (241, 1)), (161, 3)) * np.array([.35, .75, 1.0], np.float32)
    img = 1 - (1 - img) * (1 - np.clip(bloom * .95, 0, 1)) * (1 - np.clip(streak * 2.2, 0, 1))

    # volumetric god rays from a key light above-left: radial smear of the highlights
    lum2 = (.0722 * img[..., 0] + .7152 * img[..., 1] + .2126 * img[..., 2])[..., None]
    src_hi = (img * np.clip((lum2 - .5) / .5, 0, 1)).astype(np.float32)
    cx, cy = W * RCX, -H * .1
    acc = np.zeros_like(src_hi)
    for k in range(1, 13):
        sc = 1 + k * .035
        M = np.float32([[sc, 0, cx * (1 - sc)], [0, sc, cy * (1 - sc)]])
        acc += cv2.warpAffine(src_hi, M, (W, H), flags=cv2.INTER_LINEAR) * (1 - k / 13)
    rays = cv2.GaussianBlur(acc / 6.5, (0, 0), 6) * np.array([.3, .62, 1.0], np.float32)
    img = 1 - (1 - img) * (1 - np.clip(rays * .55, 0, 1))

    # dust bokeh
    dust = np.zeros((H, W), np.float32)
    for L in layers:
        lay = np.zeros((H, W), np.float32)
        ys = (L["y"] - L["v"] * t) % H
        xs = (L["x"] + L["drift"] * 30 * t + 8 * np.sin(t * .7 + L["ph"])) % W
        tw = .45 + .55 * (0.5 + 0.5 * np.sin(t * 2.1 + L["ph"] * 3))
        for x, y, s, a in zip(xs, ys, L["s"], tw):
            cv2.circle(lay, (int(x), int(y)), max(1, int(s)), float(a), -1, cv2.LINE_AA)
        if L["blur"]:
            lay = cv2.GaussianBlur(lay, (0, 0), L["blur"])
        dust += lay * L["a"]
    dust = np.clip(dust, 0, 1)[..., None] * np.array([.45, .78, 1.0], np.float32)
    img = 1 - (1 - img) * (1 - dust * .8)

    # vignette, grain
    img = img * vignette
    grain = rng.normal(0, .016, (H, W)).astype(np.float32)[..., None]
    img = np.clip(img + grain * (.4 + .6 * (1 - img)), 0, 1)

    cv2.imwrite(f"{out}/g{i + 1:03d}.png", (img * 255 + .5).astype(np.uint8))
print("graded", N)
