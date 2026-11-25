"""Az Éclat hangulati illusztrációk jelenetei.

Futtatás (a booking/ mappából):  python3 scripts/illustrations/scenes.py
Kimenet: public/illustrations/<név>.svg — ezeket a scripts/illustrations/rasterize.mjs alakítja WebP-be.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from lib import PAL, Scene  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "illustrations")


def mural_trees(sc, x0, y0, x1, y1, trunks, depth=5, bloom=0.45, birds=()):
    """Chinoiserie / tájképes tapéta: fák ágakkal, levelekkel, virágokkal, madarakkal."""
    cid = sc.clip(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}"/>')

    def draw():
        sc.rect(x0, y0, x1 - x0, y1 - y0, fill=sc.lin_grad([(0, PAL["mural"], 1), (1, PAL["mural2"], 1)]))
        # távoli, halvány fák
        for tx, h in trunks:
            sc.branch(tx + 60, y1, -math.pi / 2 + sc.r.uniform(-0.15, 0.15), h * 0.55, 6, depth - 2,
                      color=PAL["branch_soft"], leaf_cols=[PAL["leaf2"], PAL["sage_lt"]], bloom=0.2, leaf_size=14)
        for tx, h in trunks:
            sc.branch(tx, y1, -math.pi / 2 + sc.r.uniform(-0.12, 0.12), h, 9, depth, bloom=bloom, bloom_r=9, leaf_size=21)
        for bx, by, s, flip in birds:
            sc.bird(bx, by, s, flip)
    sc.group(draw, clip=cid)


def salon():
    W, H = 1600, 1200
    sc = Scene(W, H, seed=11)
    wains_top, floor_top = 770, 1085
    sc.rect(0, 0, W, H, fill=PAL["wall"])
    mural_trees(sc, 0, 52, W, wains_top, trunks=[(60, 470), (300, 380), (520, 300), (800, 330), (1080, 300), (1300, 390), (1540, 460)],
                birds=[(250, 230, 1.0, False), (1360, 200, 1.0, True)])
    sc.moulding(0, 30, W, 22)
    sc.moulding(0, wains_top, W, 18)
    sc.rect(0, wains_top + 18, W, floor_top - wains_top - 18, fill=PAL["wall"])
    sc.panels(0, wains_top + 18, W, floor_top - wains_top - 18, cols=5, inset=28, gap=34)
    sc.rect(0, floor_top - 26, W, 26, fill=PAL["wall2"], stroke=PAL["line_dk"], sw=1)  # szegélyléc
    sc.herringbone(0, floor_top, W, H - floor_top, 1.1)
    # tükör, falikarok
    sc.mirror_arched(800, 150, 420, 690)
    sc.sconce(500, 360, 1.25)
    sc.sconce(1100, 360, 1.25)
    # komód
    sc.ellipse(800, floor_top + 8, 330, 16, PAL["ink"], 0.10)
    sc.cabinet(560, 712, 480, floor_top - 712, top_h=24, doors=2, drawers=2, legs=16)
    # rajta
    sc.vase(690, 712, 120, 110, PAL["white"], band=PAL["toile"])
    sc.hydrangea(690, 560, 105, 82, n=140)
    sc.books(855, 712)
    sc.rect(965, 640, 14, 72, fill=PAL["gold"], rx=3)
    sc.rect(968, 600, 8, 42, fill=PAL["white"], rx=2)
    sc.ellipse(972, 592, 3, 7, "#F3D28B")
    return sc


def sprig_wallpaper(sc, x, y, w, h, col=None, bloom=None, size=70):
    """Apró ágacskás tapétaminta (a hálószobai panelekhez)."""
    col = col or PAL["leaf"]
    bloom = bloom or PAL["blush"]
    pid = sc.uid("sp")
    m = size / 2
    sc.defs_add(
        f'<pattern id="{pid}" width="{size}" height="{size}" patternUnits="userSpaceOnUse">'
        f'<rect width="{size}" height="{size}" fill="{PAL["linen"]}"/>'
        f'<path d="M{m-14} {m+16} Q{m-4} {m} {m+12} {m-18}" stroke="{PAL["branch_soft"]}" stroke-width="1.4" fill="none"/>'
        f'<ellipse cx="{m-6}" cy="{m+4}" rx="7" ry="3" fill="{col}" opacity="0.8" transform="rotate(-50 {m-6} {m+4})"/>'
        f'<ellipse cx="{m+4}" cy="{m-8}" rx="7" ry="3" fill="{col}" opacity="0.8" transform="rotate(30 {m+4} {m-8})"/>'
        f'<circle cx="{m+12}" cy="{m-19}" r="4.5" fill="{bloom}"/><circle cx="{m+12}" cy="{m-19}" r="1.6" fill="{PAL["gold"]}"/>'
        f'<circle cx="3" cy="3" r="2.6" fill="{bloom}" opacity="0.7"/><circle cx="{size-3}" cy="{size-3}" r="2.6" fill="{bloom}" opacity="0.7"/>'
        f'</pattern>')
    sc.rect(x, y, w, h, fill=f"url(#{pid})")


def bath():
    W, H = 1600, 900
    sc = Scene(W, H, seed=23)
    wains = 560
    sc.rect(0, 0, W, H, fill=PAL["wall"])
    cid = sc.clip(f'<rect x="0" y="0" width="{W}" height="{wains}"/>')

    def mural():
        sc.rect(0, 0, W, wains, fill=sc.lin_grad([(0, "#E4E5DD", 1), (1, PAL["mural2"], 1)]))
        warm = [PAL["blossom"], PAL["blush"], PAL["blossom2"]]
        for x0, ang, ln in [(-20, -0.9, 330), (60, -1.25, 380), (1620, -2.2, 340), (1540, -1.9, 380), (360, -1.5, 260), (1240, -1.6, 270)]:
            sc.branch(x0, wains, ang, ln, 8, 5, bloom=0.75, bloom_r=11, leaf_size=19, bloom_cols=warm)
        sc.bird(330, 180, 1.0)
        sc.bird(1280, 150, 0.9, True)
    sc.group(mural, clip=cid)
    sc.moulding(0, wains, W, 16)
    # lambéria (függőleges deszkázás)
    sc.rect(0, wains + 16, W, H - wains - 16, fill=PAL["white"])
    for x in range(0, W, 36):
        sc.line(x, wains + 16, x, H, PAL["line"], 1.4)
    sc.mirror_oval(800, 265, 150, 195, frame=20)
    sc.sconce(560, 250, 1.1)
    sc.sconce(1040, 250, 1.1)
    # mosdószekrény
    sc.ellipse(800, H - 2, 340, 12, PAL["ink"], 0.08)
    sc.cabinet(500, 600, 600, 300, top_h=26, doors=2, drawers=1, legs=0)
    sc.ellipse(800, 604, 120, 9, "#E8E4DC", stroke=PAL["line_dk"], sw=1)
    # sárgaréz csaptelep
    g = PAL["gold"]
    sc.path("M770 600 L770 560 M830 600 L830 560 M770 560 Q800 520 830 560", stroke=g, sw=6)
    sc.path("M800 545 Q800 520 815 520 L815 540", stroke=g, sw=5)
    sc.circle(770, 556, 8, g)
    sc.circle(830, 556, 8, g)
    # kancsó pünkösdi rózsával
    sc.vase(1015, 600, 92, 84, PAL["white"])
    sc.hydrangea(1015, 470, 78, 62, cols=[PAL["blush"], PAL["blossom"], PAL["blossom2"], PAL["white"]], n=90)
    # szappan, kis tálca
    sc.ellipse(600, 596, 44, 6, PAL["gold"], 0.9)
    sc.rect(578, 582, 30, 14, fill=PAL["blossom2"], rx=6, stroke=PAL["line"], sw=1)
    sc.rect(612, 568, 16, 28, fill=PAL["white"], rx=4, stroke=PAL["line"], sw=1)
    return sc


def bedroom():
    W, H = 1000, 1250
    sc = Scene(W, H, seed=31)
    floor = 1060
    sc.rect(0, 0, W, H, fill=PAL["wall"])
    sc.moulding(0, 26, W, 20)
    # panelek tapétával
    gap, top, bot = 40, 90, floor - 60
    pw = (W - 4 * gap) / 3
    for i in range(3):
        px = gap + i * (pw + gap)
        sprig_wallpaper(sc, px, top, pw, bot - top)
        sc.rect(px, top, pw, bot - top, stroke=PAL["line_dk"], sw=2)
        sc.rect(px - 8, top - 8, pw + 16, bot - top + 16, stroke=PAL["white"], sw=3)
    sc.rect(0, floor - 30, W, 30, fill=PAL["wall2"], stroke=PAL["line_dk"], sw=1)
    sc.herringbone(0, floor, W, H - floor, 0.9)
    # kép az ágy fölött
    sc.frame_landscape(380, 250, 240, 180)
    # fali lámpák helyett éjjeliszekrény-lámpa
    sc.rect(790, 820, 170, 180, fill=PAL["wood"], stroke=PAL["wood_dk"], sw=1.4, rx=3)
    sc.rect(800, 832, 150, 60, stroke=PAL["wood_dk"], sw=1.2)
    sc.circle(875, 862, 5, PAL["gold"])
    sc.rect(790, 1000, 12, 60, fill=PAL["wood_dk"])
    sc.rect(948, 1000, 12, 60, fill=PAL["wood_dk"])
    g = sc.rad_grad([(0, "#FFF6DF", 0.85), (0.5, "#F8E9C4", 0.3), (1, "#F8E9C4", 0)])
    sc.circle(875, 700, 160, g)
    sc.vase(875, 820, 100, 92, PAL["white"], band=PAL["toile"])
    sc.path("M820 640 L930 640 L955 720 L795 720Z", fill=PAL["shade"], stroke=PAL["line_dk"], sw=1.2)
    for i in range(-7, 8):
        sc.line(875 + i * 7.5, 642, 875 + i * 10.5, 718, PAL["line"], 0.9)
    # ágy
    hx0, hx1, ht = 250, 750, 560
    sc.path(f"M{hx0} 1000 L{hx0} {ht+60} Q{hx0} {ht} {hx0+80} {ht} Q500 {ht-60} {hx1-80} {ht} Q{hx1} {ht} {hx1} {ht+60} L{hx1} 1000Z",
            fill=PAL["linen"], stroke=PAL["line_dk"], sw=2)
    sc.path(f"M{hx0+18} 1000 L{hx0+18} {ht+66} Q{hx0+18} {ht+18} {hx0+90} {ht+18} Q500 {ht-40} {hx1-90} {ht+18} Q{hx1-18} {ht+18} {hx1-18} {ht+66} L{hx1-18} 1000",
            stroke=PAL["line"], sw=1.6)
    for px, w, c in [(285, 210, PAL["white"]), (505, 210, PAL["white"]), (300, 180, PAL["sage"]), (520, 180, PAL["sage"]), (420, 160, PAL["blossom2"])]:
        y = 740 if c != PAL["blossom2"] else 790
        if c == PAL["sage"]:
            y = 770
        sc.rect(px, y, w, 90, fill=c, stroke=PAL["line_dk"], sw=1.2, rx=26)
    sc.rect(200, 850, 600, 210, fill=PAL["white"], stroke=PAL["line_dk"], sw=1.6, rx=10)
    sc.rect(200, 935, 600, 60, fill=PAL["sage_dk"], op=0.85, rx=4)
    for i in range(12):
        sc.line(210 + i * 50, 995, 214 + i * 50, 1010, PAL["sage_dk"], 2)
    sc.ellipse(500, 1075, 380, 14, PAL["ink"], 0.08)
    return sc


def living():
    W, H = 1400, 1050
    sc = Scene(W, H, seed=41)
    floor = 880
    sc.rect(0, 0, W, H, fill=PAL["wall"])
    sc.moulding(0, 24, W, 22)
    # boiserie panelek
    for x in (60, 1060):
        sc.rect(x, 120, 280, 700, stroke=PAL["line"], sw=2)
        sc.rect(x + 10, 130, 260, 680, stroke=PAL["white"], sw=1.6)
        sc.rect(x, 120, 280, 700, fill=sc.lin_grad([(0, "#FFFFFF", 0.25), (1, "#000000", 0.03)]))
    # íves francia ablak kerttel
    wx, ww, wt, wb = 470, 460, 120, floor - 10
    r = ww / 2
    d = f"M{wx} {wb} L{wx} {wt+r} A{r} {r} 0 0 1 {wx+ww} {wt+r} L{wx+ww} {wb}Z"
    cid = sc.clip(f'<path d="{d}"/>')

    def view():
        sc.rect(wx, wt, ww, wb - wt, fill=sc.lin_grad([(0, "#F2F3EE", 1), (1, "#E5EADF", 1)]))
        sc.path(f"M{wx} 560 Q{wx+140} 470 {wx+260} 540 T{wx+ww} 500 L{wx+ww} {wb} L{wx} {wb}Z", fill=PAL["hill"], op=0.8)
        sc.rect(wx, 620, ww, 40, fill=PAL["water"], op=0.8)
        sc.path(f"M{wx} 680 Q{wx+200} 650 {wx+ww} 690 L{wx+ww} {wb} L{wx} {wb}Z", fill=PAL["leaf"], op=0.85)
        for k in range(6):
            sc.hydrangea(wx + 40 + k * 80, 760, 50, 34, n=40, stems=False)
    sc.group(view, clip=cid)
    # osztósor
    sc.path(d, stroke=PAL["white"], sw=16)
    sc.path(d, stroke=PAL["line_dk"], sw=1.4)
    sc.line(wx + ww / 2, wt + 8, wx + ww / 2, wb, PAL["white"], 10)
    for k in range(1, 5):
        y = wt + r + k * (wb - wt - r) / 5
        sc.line(wx, y, wx + ww, y, PAL["white"], 6)
    sc.path(f"M{wx+ww/2} {wt+r} L{wx+ww/2-r*0.7} {wt+r*0.3} M{wx+ww/2} {wt+r} L{wx+ww/2+r*0.7} {wt+r*0.3}", stroke=PAL["white"], sw=6)
    # függönyök
    for side in (-1, 1):
        cx = wx - 40 if side < 0 else wx + ww + 40
        sc.path(f"M{cx-60} 80 L{cx+60} 80 Q{cx+side*-10+40} 500 {cx+side*-30+50} {floor} L{cx-50} {floor} Q{cx-60} 500 {cx-60} 80Z",
                fill=PAL["linen"], stroke=PAL["line_dk"], sw=1.2, op=0.95)
        for k in range(-2, 3):
            sc.path(f"M{cx+k*22} 84 Q{cx+k*20} 480 {cx+k*24} {floor-4}", stroke=PAL["line"], sw=1.4)
    sc.rect(wx - 140, 70, ww + 280, 12, fill=PAL["gold"], rx=6)
    sc.chandelier(700, 30, 0.9)
    sc.herringbone(0, floor, W, H - floor, 1.0)
    # szőnyeg
    sc.ellipse(700, 990, 520, 60, PAL["toile"], 0.25)
    sc.ellipse(700, 990, 470, 48, "none", stroke=PAL["blush"], sw=6, op=0.6)
    # kerek asztal virággal
    sc.ellipse(700, 960, 230, 18, PAL["ink"], 0.08)
    sc.rect(690, 800, 20, 150, fill=PAL["wood_dk"])
    sc.path("M640 960 Q700 930 760 960", stroke=PAL["wood_dk"], sw=12)
    sc.ellipse(700, 795, 200, 18, PAL["wood"], stroke=PAL["wood_dk"], sw=1.4)
    sc.vase(700, 790, 130, 110, PAL["white"], band=PAL["toile"])
    sc.hydrangea(700, 615, 130, 95, n=170)
    return sc


def terrace():
    W, H = 1000, 1250
    sc = Scene(W, H, seed=53)
    ground = 900
    sc.rect(0, 0, W, ground, fill=sc.lin_grad([(0, "#F1F1EB", 1), (0.6, "#ECEDE5", 1), (1, "#E6E7DD", 1)]))
    sc.path(f"M0 560 Q220 480 420 540 T1000 520 L1000 640 L0 640Z", fill=PAL["hill"], op=0.75)
    sc.path(f"M0 600 Q300 560 600 600 T1000 590 L1000 650 L0 650Z", fill=PAL["hill2"], op=0.55)
    sc.rect(0, 640, W, 90, fill=PAL["water"], op=0.85)
    sc.water_lines(0, W, 645, 728, 30)
    sc.sailboat(640, 690, 0.9)
    sc.path(f"M0 730 Q500 700 1000 735 L1000 {ground} L0 {ground}Z", fill=PAL["leaf"], op=0.8)
    # lugas (pergola) rózsával
    for x in (110, 890):
        sc.rect(x - 16, 180, 32, ground - 180, fill=PAL["white"], stroke=PAL["line_dk"], sw=1.4)
    sc.path("M94 260 Q500 20 906 260", stroke=PAL["white"], sw=34)
    sc.path("M94 260 Q500 20 906 260", stroke=PAL["line_dk"], sw=1.2, op=0.6)
    warm = [PAL["blush"], PAL["blossom"], PAL["white"]]
    for x, ang, y0 in [(104, -1.45, ground - 20), (896, -1.69, ground - 20), (118, -1.62, ground - 260), (882, -1.52, ground - 260)]:
        sc.branch(x, y0, ang, 230, 5, 4, bloom=0.9, bloom_r=13, leaf_size=19, bloom_cols=warm)
    for x in range(140, 880, 60):
        t = (x - 94) / 812
        y = (1 - t) ** 2 * 260 + 2 * (1 - t) * t * 20 + t * t * 260
        sc.blossom(x, y + sc.r.uniform(-10, 10), 14, sc.r.choice(warm))
        sc.leaf(x + 10, y + 16, 1.2, 22, PAL["leaf"])
    # terasz cementlappal
    sc.tiles(0, ground, W, H - ground, 62)
    sc.rect(0, ground, W, H - ground, fill=sc.lin_grad([(0, PAL["ink"], 0.12), (0.3, PAL["ink"], 0)]))
    # bisztróasztal és székek
    sc.ellipse(500, 1170, 210, 18, PAL["ink"], 0.1)
    sc.path("M500 1010 L500 1150 M460 1165 L500 1150 L540 1165", stroke=PAL["ink"], sw=6, op=0.8)
    sc.ellipse(500, 1005, 140, 16, PAL["white"], stroke=PAL["line_dk"], sw=1.4)
    for cx, f in ((290, 1), (710, -1)):
        sc.path(f"M{cx} 1170 L{cx} 1060 M{cx+60*f} 1170 L{cx+60*f} 1060 M{cx-6} 1060 L{cx+66*f} 1060", stroke=PAL["ink"], sw=4, op=0.75)
        sc.path(f"M{cx} 1060 L{cx-4*f} 930 Q{cx+30*f} 900 {cx+62*f} 930 L{cx+60*f} 1060", stroke=PAL["ink"], sw=4, op=0.75)
    sc.vase(500, 1000, 50, 44, PAL["white"])
    sc.hydrangea(500, 945, 52, 36, n=40, stems=False)
    # cserepes hortenzia
    for x in (170, 830):
        sc.path(f"M{x-60} 1000 L{x+60} 1000 L{x+44} 1120 L{x-44} 1120Z", fill=PAL["terracotta"], stroke=PAL["wood_dk"], sw=1.2)
        sc.rect(x - 66, 992, 132, 16, fill=PAL["terracotta"], stroke=PAL["wood_dk"], sw=1.2)
        sc.hydrangea(x, 930, 92, 70, cols=["#E9E6F1", PAL["white"], "#DCE1EE", PAL["blossom2"]], n=90)
    return sc


def lake():
    W, H = 1000, 1250
    sc = Scene(W, H, seed=61)
    horizon = 560
    sc.rect(0, 0, W, horizon, fill=sc.lin_grad([(0, "#E9EDE8", 1), (1, "#F5F1E8", 1)]))
    sc.circle(720, 220, 60, "#F7EEDB", 0.9)
    # északi part hegyei (tanúhegyek sziluettje)
    sc.path(f"M0 {horizon-40} Q90 {horizon-120} 180 {horizon-110} Q250 {horizon-170} 330 {horizon-150} L380 {horizon-150} Q430 {horizon-140} 470 {horizon-80} "
            f"Q620 {horizon-120} 760 {horizon-90} Q860 {horizon-140} 1000 {horizon-70} L1000 {horizon} L0 {horizon}Z", fill=PAL["hill"], op=0.75)
    sc.path(f"M0 {horizon-10} Q250 {horizon-50} 500 {horizon-25} T1000 {horizon-20} L1000 {horizon} L0 {horizon}Z", fill=PAL["hill2"], op=0.6)
    sc.rect(0, horizon, W, H - horizon, fill=sc.lin_grad([(0, "#C9D5D3", 1), (1, PAL["water"], 1)]))
    sc.water_lines(0, W, horizon + 6, 1050, 70)
    sc.sailboat(300, horizon + 70, 1.1)
    sc.sailboat(640, horizon + 40, 0.7)
    # stég
    sc.path(f"M470 {H} L600 {H} L540 860 L520 860Z", fill=PAL["wood_lt"], stroke=PAL["wood_dk"], sw=1.4)
    for k in range(14):
        t = k / 14
        y = 860 + (H - 860) * t ** 1.3
        xl = 520 - 50 * t ** 1.3
        xr = 540 + 60 * t ** 1.3
        sc.line(xl, y, xr, y, PAL["wood_dk"], 1.2, 0.6)
    sc.reeds(0, 320, H, 360, 60)
    sc.reeds(700, 1000, H, 320, 50)
    return sc


def dusk():
    W, H = 1600, 900
    sc = Scene(W, H, seed=71)
    horizon = 470
    sc.rect(0, 0, W, horizon, fill=sc.lin_grad([(0, "#EDEAE0", 1), (0.6, "#F3E2D3", 1), (1, "#F2D7BE", 1)]))
    g = sc.rad_grad([(0, "#FBEBCB", 1), (0.35, "#F6D9AE", 0.6), (1, "#F6D9AE", 0)])
    sc.circle(980, horizon - 30, 260, g)
    sc.circle(980, horizon - 30, 46, "#F9E7C2")
    sc.path(f"M0 {horizon-30} Q200 {horizon-90} 380 {horizon-70} Q470 {horizon-120} 560 {horizon-100} Q700 {horizon-60} 900 {horizon-50} "
            f"Q1150 {horizon-90} 1350 {horizon-60} Q1480 {horizon-80} 1600 {horizon-40} L1600 {horizon} L0 {horizon}Z", fill="#BBB7A6", op=0.7)
    sc.rect(0, horizon, W, H - horizon, fill=sc.lin_grad([(0, "#E7D6C2", 1), (1, "#C9C9BC", 1)]))
    for i in range(40):
        y = horizon + 8 + i * 10
        w = 30 + i * 6
        sc.path(f"M{980 - w/2 + sc.r.uniform(-20,20):.1f} {y} q{w/2:.1f} -2 {w:.1f} 0", stroke="#FBE7C4", sw=3, op=0.75 - i * 0.015)
    sc.water_lines(0, W, horizon + 10, H, 60, col="#B2A895")
    sc.sailboat(560, horizon + 60, 0.9)
    sc.reeds(0, 360, H, 300, 70, col="#6F6A5A")
    sc.reeds(1240, 1600, H, 280, 70, col="#6F6A5A")
    return sc


SCENES = {"salon": salon, "bath": bath, "bedroom": bedroom, "living": living, "terrace": terrace, "lake": lake, "dusk": dusk}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(SCENES)
    for n in names:
        svg = SCENES[n]().svg()
        with open(os.path.join(OUT, f"{n}.svg"), "w") as f:
            f.write(svg)
        print(f"{n}.svg  {len(svg)//1024} KB")
