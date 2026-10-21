#!/usr/bin/env python3
"""Decompose each reference image into animation layers.

references/sceneNN.png + assets/layers.json  ->  assets/plates/sceneNN/
    plate.webp     clean background (boy, baked text, marks removed by shift-map inpainting),
                   sky made transparent, 2x Lanczos upscale (3072x2048)
    sky.webp       sky-only layer (non-sky filled) for parallax
    cut_<name>.png cutout layers (RGBA) lifted from the original image
    crop_<name>.png rectangular crops reused in motion graphics
assets/plates/manifest.json  geometry of every layer (reference-pixel coordinates)

Run:  python3 scripts/prepare_plates.py [scene01 ...]
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = 2  # upscale factor for plates (1536x1024 -> 3072x2048)
SKY_MAX_Y = {"scene01": 650, "scene02": 520, "scene03": 470, "scene04": 470,
             "scene05": 470, "scene06": 400, "scene07": 380, "scene08": 470}


def poly_mask(shape, poly):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    return m


def _interp_rows(img, m):
    """Row-wise linear colour interpolation across each hole run. Returns (filled, unfilled_mask)."""
    out = img.astype(np.float32).copy()
    H, W = m.shape
    left = np.zeros_like(m)
    for y in range(H):
        row = m[y]
        if not row.any():
            continue
        xs = np.flatnonzero(np.diff(np.concatenate([[0], row.astype(np.int8), [0]])))
        for x0, x1 in zip(xs[0::2], xs[1::2]):  # hole = [x0, x1)
            lc = np.median(img[y, max(0, x0 - 14):max(0, x0 - 3)], axis=0) if x0 > 4 else None
            rc = np.median(img[y, min(W, x1 + 3):min(W, x1 + 14)], axis=0) if x1 < W - 4 else None
            if lc is None and rc is None:
                left[y, x0:x1] = True
                continue
            lc = rc if lc is None else lc
            rc = lc if rc is None else rc
            u = np.linspace(0, 1, x1 - x0)[:, None]
            out[y, x0:x1] = lc * (1 - u) + rc * u
    return out, left


def row_fill(img, mask):
    """Fill holes by interpolating between the colours on either side of each hole run (rows first,
    then columns for runs spanning the full width). Outdoor plates are dominated by horizontal
    structure (sky, roofs, horizon, ground), so this continues them more naturally than radial
    (Telea) smearing and never clones objects."""
    m = mask > 0
    out, left = _interp_rows(img, m)
    if left.any():
        o2, left2 = _interp_rows(np.ascontiguousarray(out.astype(np.uint8).transpose(1, 0, 2)), np.ascontiguousarray(left.T))
        o2 = o2.transpose(1, 0, 2)
        out[left] = o2[left]
        if left2.any():
            rest = (left2.T * 255).astype(np.uint8)
            out = cv2.inpaint(out.astype(np.uint8), rest, 9, cv2.INPAINT_TELEA).astype(np.float32)
    sm = cv2.GaussianBlur(out, (0, 0), sigmaX=4, sigmaY=10)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.5)[..., None]
    res = sm * a + out * (1 - a)
    rng = np.random.default_rng(1650)
    res += rng.normal(0, 2.5, res.shape).astype(np.float32) * a
    return np.clip(res, 0, 255).astype(np.uint8)


def fill_regions(img, mask):
    """Neutral, artifact-free hole filling.

    Patch-based methods (shift-map) were tested first but cloned whole people/text into large
    holes, and Telea smears dark outlines radially. Small regions -> full-resolution Telea;
    large regions (the boy, text boxes, card bands) -> row-wise colour interpolation. Large holes
    are covered by the re-drawn character / UI layers, so mostly only their edges are seen.
    """
    out = img.copy()
    n, labels, stats, _ = cv2.connectedComponentsWithStats((mask > 0).astype(np.uint8))
    small_mask = np.zeros_like(mask)
    big_mask = np.zeros_like(mask)
    for i in range(1, n):
        (small_mask if stats[i][4] < 48000 else big_mask)[labels == i] = 255
    if small_mask.any():
        out = cv2.inpaint(out, small_mask, 7, cv2.INPAINT_TELEA)
    if big_mask.any():
        out = row_fill(out, big_mask)
    return out


def sky_mask(img, max_y):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    b, g, r = [img[..., i].astype(int) for i in range(3)]
    blue = (h >= 95) & (h <= 125) & (s > 45) & (v > 130) & (b > r + 40)
    cloud = (s < 40) & (v > 215) & (b >= r - 5)
    m = ((blue | cloud) * 255).astype(np.uint8)
    m[max_y:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # keep only regions touching the top band
    n, labels, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        x, y, w, hh, area = stats[i]
        if y <= 6 and area > 400:
            keep[labels == i] = 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # fill small holes (birds, rigging gaps) but not buildings
    inv = 255 - keep
    n, labels, stats, _ = cv2.connectedComponentsWithStats(inv)
    for i in range(1, n):
        if stats[i][4] < 250:
            keep[labels == i] = 255
    return keep


def upscale(pil, factor=UP):
    w, h = pil.size
    big = pil.resize((w * factor, h * factor), Image.LANCZOS)
    if big.mode == "RGBA":
        rgb, a = big.convert("RGB"), big.getchannel("A")
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        big = Image.merge("RGBA", (*rgb.split(), a))
    else:
        big = big.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return big


def remove_red_x(crop_bgr):
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    red = (((hsv[..., 0] < 10) | (hsv[..., 0] > 170)) & (hsv[..., 1] > 120) & (hsv[..., 2] > 120))
    m = cv2.dilate((red * 255).astype(np.uint8), np.ones((5, 5), np.uint8))
    return cv2.inpaint(crop_bgr, m, 4, cv2.INPAINT_TELEA)


def desaturate_red(img, rects):
    for x, y, w, h in rects:
        roi = img[y:y + h, x:x + w]
        b, g, r = [roi[..., i].astype(int) for i in range(3)]
        red = (r > g + 35) & (r > b + 35)
        gray = ((r + g + b) / 3 * 0.75).astype(np.uint8)
        for c, k in zip(range(3), (0.85, 0.95, 1.05)):
            ch = roi[..., c]
            ch[red] = np.clip(gray[red] * k, 0, 255).astype(np.uint8)


def process(name, cfg, manifest):
    src = cv2.imread(os.path.join(ROOT, "references", f"{name}.png"))
    out_dir = os.path.join(ROOT, "assets", "plates", name)
    os.makedirs(out_dir, exist_ok=True)
    img = src.copy()
    if cfg.get("desaturateRed"):
        desaturate_red(img, cfg["desaturateRed"])
    g = cfg.get("grade")
    if g:  # bake a colour grade into the plate (cheaper than a per-frame CSS filter)
        f = img.astype(np.float32)
        lum = f.mean(axis=2, keepdims=True)
        f = lum + (f - lum) * g.get("saturate", 1)
        f = (f - 128) * g.get("contrast", 1) + 128
        img = np.clip(f * g.get("brightness", 1), 0, 255).astype(np.uint8)
    entry = {"size": [img.shape[1], img.shape[0]], "cutouts": {}, "crops": {}}

    # cutouts from the (cleaned-of-blood) original
    for cname, c in cfg.get("cutouts", {}).items():
        m = poly_mask(img.shape, c["poly"])
        m = cv2.GaussianBlur(m, (0, 0), 1.2)
        x, y, w, h = cv2.boundingRect(np.array(c["poly"], np.int32))
        rgba = np.dstack([img[y:y + h, x:x + w], m[y:y + h, x:x + w]])
        pil = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
        upscale(pil).save(os.path.join(out_dir, f"cut_{cname}.png"), optimize=True)
        entry["cutouts"][cname] = {"x": x, "y": y, "w": w, "h": h, "pivot": c["pivot"],
                                   "src": f"plates/{name}/cut_{cname}.png"}

    for cname, (x, y, w, h) in cfg.get("crops", {}).items():
        crop = img[y:y + h, x:x + w].copy()
        if name == "scene02":
            crop = remove_red_x(crop)
        pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        upscale(pil).save(os.path.join(out_dir, f"crop_{cname}.png"), optimize=True)
        entry["crops"][cname] = {"x": x, "y": y, "w": w, "h": h, "src": f"plates/{name}/crop_{cname}.png"}

    # removal mask
    mask = np.zeros(img.shape[:2], np.uint8)
    for key, poly in cfg["remove"].items():
        m = poly_mask(img.shape, poly)
        if key == "boy":  # hair spikes/outline extend past the hand-traced polygon
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (33, 33)))
        mask |= m
    for c in cfg.get("cutouts", {}).values():
        if c.get("inpaintUnder"):
            mask |= poly_mask(img.shape, c["poly"])
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    clean = fill_regions(img, mask)
    # regions that stay visible for a long time get the patch-based fill instead (sources = all
    # pixels outside every hole, so no text/boy can be cloned)
    sm_keys = cfg.get("shiftmap", [])
    if sm_keys:
        sm_mask = np.zeros_like(mask)
        for k in sm_keys:
            sm_mask |= cv2.dilate(poly_mask(img.shape, cfg["remove"][k]), np.ones((9, 9), np.uint8))
        q = 0.5
        small = cv2.resize(img, None, fx=q, fy=q, interpolation=cv2.INTER_AREA)
        ms = cv2.dilate(cv2.resize(mask, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
        dst = np.zeros_like(small)
        cv2.xphoto.inpaint(small, 255 - ms, dst, cv2.xphoto.INPAINT_SHIFTMAP)
        up = cv2.resize(dst, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
        a = cv2.GaussianBlur(sm_mask.astype(np.float32) / 255.0, (0, 0), 2.0)[..., None]
        clean = (up * a + clean * (1 - a)).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, "_mask.png"), mask)

    # sky separation for parallax
    sky_alpha = sky_mask(clean, SKY_MAX_Y[name])  # what becomes transparent in the plate
    sky = sky_alpha.copy()
    sky[mask > 0] = 0  # ...but filled holes are never used as sky-layer source pixels
    small = cv2.resize(clean, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    sm = cv2.resize(255 - sky, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    sm = cv2.dilate(sm, np.ones((3, 3), np.uint8))
    sky_fill = cv2.inpaint(small, sm, 6, cv2.INPAINT_TELEA)
    sky_fill = cv2.GaussianBlur(sky_fill, (0, 0), 1.5)
    sky_img = cv2.resize(sky_fill, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    # keep real sky detail where it exists
    a = cv2.GaussianBlur(sky.astype(np.float32) / 255, (0, 0), 1.0)[..., None]
    sky_img = (clean * a + sky_img * (1 - a)).astype(np.uint8)
    sky_img = cv2.GaussianBlur(sky_img, (0, 0), 3.0)  # sky only shows through gaps: keep it soft
    Image.fromarray(cv2.cvtColor(sky_img, cv2.COLOR_BGR2RGB)).resize(
        (img.shape[1] * UP, img.shape[0] * UP), Image.BICUBIC).save(
        os.path.join(out_dir, "sky.webp"), quality=90)

    alpha = 255 - cv2.GaussianBlur(sky_alpha, (0, 0), 0.8)
    rgba = np.dstack([clean, alpha])
    plate = upscale(Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)))
    plate.save(os.path.join(out_dir, "plate.webp"), quality=92, method=6)
    cv2.imwrite(os.path.join(out_dir, "_clean.jpg"), clean, [cv2.IMWRITE_JPEG_QUALITY, 88])
    entry.update({"plate": f"plates/{name}/plate.webp", "sky": f"plates/{name}/sky.webp"})
    manifest[name] = entry
    print(name, "done", f"sky {int((sky > 0).mean() * 100)}%")


def main():
    cfg = json.load(open(os.path.join(ROOT, "assets", "layers.json")))
    names = [a for a in sys.argv[1:] if a.startswith("scene")] or [k for k in cfg if k.startswith("scene")]
    mpath = os.path.join(ROOT, "assets", "plates", "manifest.json")
    os.makedirs(os.path.dirname(mpath), exist_ok=True)
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for n in names:
        process(n, cfg[n], manifest)
    json.dump(dict(sorted(manifest.items())), open(mpath, "w"), indent=1)


if __name__ == "__main__":
    main()
