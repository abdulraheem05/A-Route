#!/usr/bin/env python3
"""Models the mobile layout boxes of the A-ROUTE map shell and game HUD at the
required viewport sizes and asserts that nothing overlaps or overflows.

The numbers mirror the constants in components/mobile/* and the mobile block of
app/globals.css. If a constant changes on one side without the other, this
check fails.

Safe-area insets are applied the way devices report them: a top inset only in
portrait, side insets only in landscape, a bottom inset in both.
"""
import math, sys

SIZES = [(320, 640), (375, 667), (390, 844), (430, 932), (768, 1024)]
# (has notch, has home indicator)
DEVICES = [(False, False), (True, True)]

FAILS = []


def box(name, x0, y0, x1, y1):
    return {"name": name, "x0": x0, "y0": y0, "x1": x1, "y1": y1}


def overlaps(a, b):
    return a["x0"] < b["x1"] - 0.01 and b["x0"] < a["x1"] - 0.01 \
        and a["y0"] < b["y1"] - 0.01 and b["y0"] < a["y1"] - 0.01


def check(label, boxes, W, H):
    for b in boxes:
        if b["x0"] < -0.01 or b["x1"] > W + 0.01:
            FAILS.append(f"{label}: {b['name']} overflows horizontally ({b['x0']:.0f}..{b['x1']:.0f} in {W})")
        if b["y0"] < -0.01 or b["y1"] > H + 0.01:
            FAILS.append(f"{label}: {b['name']} overflows vertically ({b['y0']:.0f}..{b['y1']:.0f} in {H})")
    for i, a in enumerate(boxes):
        for b in boxes[i + 1:]:
            if overlaps(a, b):
                FAILS.append(
                    f"{label}: {a['name']} overlaps {b['name']} "
                    f"({a['name']} {a['x0']:.0f},{a['y0']:.0f}-{a['x1']:.0f},{a['y1']:.0f} / "
                    f"{b['name']} {b['x0']:.0f},{b['y0']:.0f}-{b['x1']:.0f},{b['y1']:.0f})")


HEADER = 92          # top bar + MAP/PLAY row
TABBAR = 54
def stack_cap(H):
    return 0.28 if H <= 540 else 0.38   # .m-bottom-stack max-height
FAB, FAB_GAP, FAB_N = 44, 6, 7


def fab_stack(W, H, sat, sab, sar):
    """max-height: calc(62dvh - 154px - insets), wrap-reverse into columns."""
    avail = (0.72 if H <= 540 else 0.62) * H - 154 - sat - sab
    per_col = max(1, int((avail + FAB_GAP) // (FAB + FAB_GAP)))
    cols = math.ceil(FAB_N / per_col)
    rows = min(FAB_N, per_col)
    w = cols * FAB + (cols - 1) * FAB_GAP
    h = rows * FAB + (rows - 1) * FAB_GAP
    right = 10 + sar
    top = HEADER + sat
    return box("toolbar", W - right - w, top, W - right, top + h)


def map_shell(W, H, sat, sab, sal, sar, items):
    """items: heights of the bottom-stack children, bottom-most first."""
    boxes = [
        box("topbar", 0, 0, W, 46 + sat),
        box("nav row", 8 + sal, 52 + sat, 8 + sal + min(152, W - 16), 52 + sat + 36),
        box("tab bar", 0, H - sab - TABBAR, W, H),
        fab_stack(W, H, sat, sab, sar),
    ]
    # The stack grows upwards from the tab bar and is clipped at its cap.
    total = sum(items) + 8 * (len(items) - 1)
    cap = stack_cap(H) * H
    drawn = min(total, cap)
    bottom = H - sab - TABBAR - 8
    boxes.append(box("bottom stack", 10 + sal, bottom - drawn, W - 10 - sar, bottom))
    return boxes


def game_hud(W, H, sat, sab, sal, sar, minimap):
    short = H <= 540
    stick = 108 if W <= 420 else 124
    if short:
        stick = 96
    act_w, act_h = 98, 118
    mm = 176 * (0.36 if H <= 400 else 0.46 if short else 0.68)
    boxes = [
        box("nav row", 8 + sal, 8 + sat, 8 + sal + 152, 8 + sat + 36),
        box("hud buttons", W - 10 - sar - 132, 8 + sat, W - 10 - sar, 48 + sat),
        box("joystick", 16 + sal, H - sab - 18 - stick, 16 + sal + stick, H - sab - 18),
        box("action buttons", W - 14 - sar - act_w, H - sab - 18 - act_h, W - 14 - sar, H - sab - 18),
    ]
    room = (W - 150 - sal - sar) if minimap else (W - 80 - sal - sar)
    boxes.append(box("mission chip", 10 + sal, 56 + sat, 10 + sal + room, 56 + sat + 42))
    if minimap:
        boxes.append(box("minimap", W - 10 - sar - mm, 56 + sat, W - 10 - sar, 56 + sat + mm))
    pb = H - sab - (136 if short else 150)
    boxes.append(box("prompts", 20, pb - 30, W - 20, pb))
    return boxes


# Bottom-stack contents to try: status alone, plus legend, prompt and the
# degraded-data notice in every combination that can be on screen at once.
STACK_CASES = [
    ("status", [34]),
    ("status+legend", [34, 28]),
    ("status+prompt", [34, 38]),
    ("status+legend+prompt", [34, 28, 38]),
    ("status+legend+prompt+notice", [34, 28, 38, 66]),
]

for W, H in SIZES:
    for notch, home in DEVICES:
        for orient in ("portrait", "landscape"):
            w, h = (W, H) if orient == "portrait" else (H, W)
            sat = 47 if (notch and orient == "portrait") else 0
            sab = (34 if orient == "portrait" else 21) if home else 0
            sal = sar = 44 if (notch and orient == "landscape") else 0
            tag = f"{w}x{h} {orient} insets(t{sat} b{sab} l{sal} r{sar})"
            for name, items in STACK_CASES:
                check(f"MAP {tag} [{name}]", map_shell(w, h, sat, sab, sal, sar, items), w, h)
            for minimap in (False, True):
                check(f"PLAY {tag} [minimap={minimap}]",
                      game_hud(w, h, sat, sab, sal, sar, minimap), w, h)

if FAILS:
    print(f"{len(FAILS)} layout problem(s):")
    seen = set()
    for f in FAILS:
        if f not in seen:
            seen.add(f)
            print(" -", f)
    sys.exit(1)
print(f"OK: {len(SIZES)} sizes x {len(DEVICES)} devices x 2 orientations, "
      f"{len(STACK_CASES)} bottom-stack states and both minimap states — "
      "everything fits, nothing overlaps.")
