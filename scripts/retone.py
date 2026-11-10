#!/usr/bin/env python3
"""Retone AI-slop rgba glow colours → muted obsidian-glass palette.

Operates on the vigilant component .tsx files + page.tsx. Only touches
rgba(...) prefixes that were left bright by the hex sweep.
"""
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/src")

# old rgba prefix → new muted rgba prefix
RTP = {
    "rgba(251,80,105": "rgba(200,122,134",   # blocked rose (was bright red)
    "rgba(52,211,153": "rgba(111,169,184",   # safe mint (was AI green)
    "rgba(251,191,36": "rgba(201,168,106",   # review sand (was AI yellow)
    "rgba(167,139,250": "rgba(124,111,230",  # indigo (was bright purple)
    "rgba(196,181,253": "rgba(155,160,245",  # soft indigo (was lavender)
    "rgba(139,92,246": "rgba(108,111,214",   # deep indigo (was bright purple)
    "rgba(124,58,237": "rgba(92,95,214",     # deep indigo (was deep purple)
    "rgba(103,48,205": "rgba(80,83,180",     # deep indigo
    "rgba(59,30,110": "rgba(40,42,90",       # deep indigo
}

targets = [
    ROOT / "components/vigilant/Canvas.tsx",
    ROOT / "components/vigilant/Sidebar.tsx",
    ROOT / "components/vigilant/TopBar.tsx",
    ROOT / "components/vigilant/PhaseSimulation.tsx",
    ROOT / "components/vigilant/PhaseReplay.tsx",
    ROOT / "components/vigilant/bits.tsx",
    ROOT / "components/vigilant/Intake.tsx",
    ROOT / "components/vigilant/SafeLoaderModal.tsx",
    ROOT / "components/vigilant/EvidenceDrawer.tsx",
    ROOT / "components/vigilant/AllowlistPopover.tsx",
    ROOT / "app/page.tsx",
]

# 1:1 hex swaps (old AI-slop → muted obsidian). Idempotent.
HEX = {
    "#f3effc": "#eef0f3",   # foreground off-white
    "#c4b5fd": "#9ba0f5",   # accent soft indigo (was bright lavender)
    "#a78bfa": "#7c6fe6",   # accent indigo (was bright purple)
    "#7c3aed": "#5b5fd6",   # accent deep indigo (was bright purple)
    "#fb5069": "#c87a86",   # blocked muted rose (was bright red)
    "#ff92a5": "#d4969e",   # blocked text (was bright pink)
    "#ffa1b0": "#d4969e",
    "#ffb3c0": "#d4969e",
    "#170a28": "#0a0a0e",   # header bg → near-black
    "#0c0517": "#050507",   # modal backdrop → absolute black
    "#0d0618": "#050507",   # drop overlay → absolute black
    "#221238": "#0e0e12",   # ring offset → near-black
    "#1a0b2e": "#0a0a0e",   # legacy gradient stop
    "#ece5fb": "#e6e8ee",   # code/mono text → neutral
    "#e9e2fb": "#e6e8ee",
    "#5b21b6": "#3a3d8a",   # legacy deep purple
    "#a074f7": "#7c6fe6",   # legacy purple
    "#d8b4fe": "#9ba0f5",   # legacy lavender border
    "#34d399": "#6fa9b8",   # emerald-400 eq (confetti/doneTone) → safe mint
    "#fbbf24": "#c9a86a",   # amber-400 eq (doneTone) → review sand
    "#0c2b1a": "#06141a",   # dark-green text on done circle → neutral dark
    "#ff8fa3": "#9ba0f5",   # keyword pink → indigo (bits.tsx syntax)
}

total_rgba = 0
total_hex = 0
for p in targets:
    if not p.exists():
        print(f"MISSING {p}")
        continue
    src = p.read_text(encoding="utf-8")
    orig = src
    for old, new in RTP.items():
        src = src.replace(old, new)
    for old, new in HEX.items():
        src = src.replace(old, new)
    if src != orig:
        nr = sum(orig.count(o) for o in RTP)
        nh = sum(orig.count(o) for o in HEX)
        p.write_text(src, encoding="utf-8")
        print(f"  {p.name}: {nr} rgba + {nh} hex")
        total_rgba += nr
        total_hex += nh
    else:
        print(f"  {p.name}: (no changes)")

print(f"\nTotal: {total_rgba} rgba + {total_hex} hex retunes")
