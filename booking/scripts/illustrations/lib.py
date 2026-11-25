"""Rajzoló primitívek az Éclat hangulati illusztrációkhoz.

Stílus: belsőépítészeti falnézet (elevation) vékony vonallal és akvarell-szerű, áttetsző színezéssel.
A motívumok a szállás moodboardjából származnak (chinoiserie ágminta, aranyozott tükrök,
lambéria, zsályazöld bútor, sárgaréz falikar, hortenzia), de minden elem saját rajz.
"""
import math
import random

PAL = {
    "paper": "#F4EFE6",
    "wall": "#EEE7DA",
    "wall2": "#E8E0D1",
    "mural": "#DFE2D8",
    "mural2": "#D3D9CE",
    "branch": "#7F8A78",
    "branch_soft": "#A3AC9B",
    "leaf": "#93A28C",
    "leaf2": "#B4BFA9",
    "blossom": "#E8CFC5",
    "blossom2": "#F3E4DC",
    "blossom_c": "#C79A6A",
    "gold": "#B48E57",
    "gold_lt": "#D6BC86",
    "gold_dk": "#8A6A3A",
    "sage": "#A9B4A2",
    "sage_dk": "#7E8C79",
    "sage_lt": "#C5CDBE",
    "wood": "#B08A63",
    "wood_dk": "#86664A",
    "wood_lt": "#C9A982",
    "marble": "#F5F2EC",
    "vein": "#D9D2C6",
    "line": "#CFC4B1",
    "line_dk": "#B5A890",
    "ink": "#4A4238",
    "shade": "#F7EFDD",
    "glass": "#E6EAE4",
    "white": "#FBF9F5",
    "blush": "#E3C3B8",
    "toile": "#7C8EAD",
    "linen": "#EFE6D6",
    "water": "#B8C7C6",
    "water_dk": "#93A8A9",
    "sky": "#EEF0EA",
    "hill": "#B6C0B0",
    "hill2": "#9DAA97",
    "terracotta": "#C49378",
}


class Scene:
    def __init__(self, w, h, seed=1, bg=PAL["paper"]):
        self.w, self.h = w, h
        self.r = random.Random(seed)
        self.defs = []
        self.body = []
        self._id = 0
        self.bg = bg

    def uid(self, p="g"):
        self._id += 1
        return f"{p}{self._id}"

    def add(self, s):
        self.body.append(s)

    def defs_add(self, s):
        self.defs.append(s)

    # ——— általános ———
    def rect(self, x, y, w, h, fill="none", stroke="none", sw=1, rx=0, op=1, extra=""):
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" {extra}/>')

    def line(self, x1, y1, x2, y2, stroke=PAL["line"], sw=1.2, op=1):
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" stroke-linecap="round"/>')

    def path(self, d, fill="none", stroke="none", sw=1, op=1, extra=""):
        self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" stroke-linecap="round" stroke-linejoin="round" {extra}/>')

    def circle(self, x, y, r, fill, op=1, stroke="none", sw=1):
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" opacity="{op}" stroke="{stroke}" stroke-width="{sw}"/>')

    def ellipse(self, x, y, rx, ry, fill, op=1, stroke="none", sw=1, extra=""):
        self.add(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{fill}" opacity="{op}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')

    def lin_grad(self, stops, x1=0, y1=0, x2=0, y2=1):
        gid = self.uid("lg")
        st = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.defs_add(f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{st}</linearGradient>')
        return f"url(#{gid})"

    def rad_grad(self, stops, cx=0.5, cy=0.5, r=0.5):
        gid = self.uid("rg")
        st = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
        self.defs_add(f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="{r}">{st}</radialGradient>')
        return f"url(#{gid})"

    def clip(self, inner):
        cid = self.uid("cp")
        self.defs_add(f'<clipPath id="{cid}">{inner}</clipPath>')
        return cid

    def group(self, fn, clip=None, op=1, extra=""):
        start = len(self.body)
        fn()
        inner = self.body[start:]
        del self.body[start:]
        c = f'clip-path="url(#{clip})"' if clip else ""
        self.add(f'<g {c} opacity="{op}" {extra}>' + "".join(inner) + "</g>")

    # ——— növényi motívumok ———
    def leaf(self, x, y, ang, size, fill):
        s = size
        d = f"M0 0 Q{s*0.5:.1f} {-s*0.32:.1f} {s:.1f} 0 Q{s*0.5:.1f} {s*0.32:.1f} 0 0Z"
        self.add(f'<path d="{d}" fill="{fill}" opacity="0.85" transform="translate({x:.1f} {y:.1f}) rotate({math.degrees(ang):.1f})"/>')

    def blossom(self, x, y, r, fill=None, center=None, op=0.95):
        fill = fill or PAL["blossom"]
        center = center or PAL["blossom_c"]
        rot = self.r.uniform(0, 72)
        for i in range(5):
            a = math.radians(rot + i * 72)
            self.circle(x + math.cos(a) * r * 0.62, y + math.sin(a) * r * 0.62, r * 0.55, fill, op)
        self.circle(x, y, r * 0.28, center, 0.9)

    def _qpt(self, x0, y0, cx, cy, x1, y1, t):
        return ((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1)

    def branch(self, x, y, ang, length, width, depth, color=None, leaf_cols=None, bloom=0.6, bloom_r=9, leaf_size=18, bloom_cols=None):
        color = color or PAL["branch"]
        leaf_cols = leaf_cols or [PAL["leaf"], PAL["leaf2"]]
        bloom_cols = bloom_cols or [PAL["blossom"], PAL["blossom2"]]
        R = self.r
        bend = R.uniform(-0.45, 0.45)
        ex, ey = x + math.cos(ang) * length, y + math.sin(ang) * length
        cx, cy = x + math.cos(ang + bend) * length * 0.55, y + math.sin(ang + bend) * length * 0.55
        self.path(f"M{x:.1f} {y:.1f} Q{cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}", stroke=color, sw=round(max(width, 0.6), 2))
        if depth <= 3:
            for t in (0.2, 0.38, 0.55, 0.72, 0.9):
                if R.random() < 0.85:
                    px, py = self._qpt(x, y, cx, cy, ex, ey, t)
                    self.leaf(px, py, ang + R.choice([-1, 1]) * R.uniform(0.5, 1.1), leaf_size * R.uniform(0.7, 1.1), R.choice(leaf_cols))
        if depth == 0:
            if R.random() < bloom:
                self.blossom(ex, ey, bloom_r * R.uniform(0.8, 1.2), R.choice(bloom_cols))
            return
        n = R.choice([2, 3]) if depth > 2 else R.choice([2, 3, 3])
        for _ in range(n):
            t = R.uniform(0.35, 1.0)
            px, py = self._qpt(x, y, cx, cy, ex, ey, t)
            self.branch(px, py, ang + R.uniform(-0.75, 0.75), length * R.uniform(0.55, 0.75), width * 0.6, depth - 1,
                        color, leaf_cols, bloom, bloom_r, leaf_size, bloom_cols)

    def bird(self, x, y, s=1.0, flip=False, col=None):
        """Ágon ülő énekesmadár (x, y = a láb helye)."""
        col = col or PAL["sage_dk"]
        f = -1 if flip else 1
        g = f'translate({x:.1f} {y:.1f}) scale({f*s:.2f} {s:.2f})'
        body = "M-4 -14 C-20 -14 -30 -24 -26 -34 C-22 -44 -6 -46 6 -40 C14 -36 18 -30 18 -24 C16 -16 8 -12 -4 -14Z"
        head = '<circle cx="12" cy="-38" r="9"/>'
        tail = "M-22 -22 L-52 -6 L-46 -2 L-18 -16Z"
        wing = "M-20 -32 C-10 -40 6 -36 8 -28 C-2 -24 -14 -24 -20 -32Z"
        breast = "M8 -30 C14 -26 14 -18 4 -14 C8 -20 8 -26 8 -30Z"
        self.add(f'<g transform="{g}">'
                 f'<path d="{tail}" fill="{col}" opacity="0.75"/>'
                 f'<path d="{body}" fill="{col}" opacity="0.9"/>'
                 f'<g fill="{col}" opacity="0.9">{head}</g>'
                 f'<path d="{breast}" fill="{PAL["blossom"]}" opacity="0.9"/>'
                 f'<path d="{wing}" fill="{PAL["sage_lt"]}" opacity="0.85"/>'
                 f'<circle cx="15" cy="-40" r="1.8" fill="{PAL["ink"]}"/>'
                 f'<path d="M20 -39 L28 -36 L20 -34Z" fill="{PAL["gold"]}"/>'
                 f'<path d="M-2 -14 L-4 0 M4 -14 L4 0" stroke="{PAL["ink"]}" stroke-width="1.4" opacity="0.6"/>'
                 f'</g>')
        # ág, amin ül
        self.path(f"M{x-60*s:.1f} {y+4*s:.1f} Q{x:.1f} {y-4*s:.1f} {x+70*s:.1f} {y+6*s:.1f}", stroke=PAL["branch"], sw=3 * s)
        for k in range(3):
            self.leaf(x + (40 + k * 12) * s * f, y + 2 * s, -0.6 + k * 0.5, 16 * s, PAL["leaf"])

    def hydrangea(self, x, y, rx, ry, cols=None, n=90, stems=True):
        R = self.r
        cols = cols or [PAL["white"], PAL["blossom2"], "#ECE9F1", PAL["blush"]]
        if stems:
            for i in range(7):
                side = -1 if i % 2 else 1
                a = math.radians(90 + side * R.uniform(35, 75))
                self.leaf(x + side * R.uniform(rx * 0.2, rx * 0.7), y + ry * R.uniform(0.35, 0.8), a + math.pi, rx * 0.6, R.choice([PAL["leaf"], PAL["sage_dk"]]))
        # alap: egymásba érő, áttetsző virágfejek
        heads = [(x + R.uniform(-rx * 0.5, rx * 0.5), y + R.uniform(-ry * 0.4, ry * 0.4)) for _ in range(5)]
        for hx, hy in heads:
            self.circle(hx, hy, rx * 0.5, R.choice(cols[:3]), 0.75)
            self.circle(hx + rx * 0.08, hy + rx * 0.1, rx * 0.5, PAL["sage_dk"], 0.06)
        # apró, négyszirmú virágok
        for _ in range(n):
            a = R.uniform(0, 2 * math.pi)
            rr = math.sqrt(R.random())
            px, py = x + math.cos(a) * rx * rr, y + math.sin(a) * ry * rr
            c = R.choice(cols)
            r = R.uniform(5, 8) * rx / 80
            rot = R.uniform(0, 90)
            for k in range(4):
                b = math.radians(rot + k * 90)
                self.ellipse(px + math.cos(b) * r * 0.55, py + math.sin(b) * r * 0.55, r * 0.55, r * 0.38, c, 0.85,
                             stroke=PAL["line"], sw=0.4, extra=f'transform="rotate({rot + k*90:.0f} {px + math.cos(b)*r*0.55:.1f} {py + math.sin(b)*r*0.55:.1f})"')
            self.circle(px, py, r * 0.14, PAL["gold_lt"], 0.8)

    # ——— építészeti elemek ———
    def panels(self, x, y, w, h, cols, inset=26, gap=26, fill=None):
        pw = (w - gap * (cols + 1)) / cols
        for i in range(cols):
            px = x + gap + i * (pw + gap)
            self.rect(px, y + inset, pw, h - 2 * inset, fill=fill or "none", stroke=PAL["line"], sw=2)
            self.rect(px + 7, y + inset + 7, pw - 14, h - 2 * inset - 14, stroke=PAL["white"], sw=1.4, op=0.9)
        return pw

    def moulding(self, x, y, w, depth=16):
        self.rect(x, y, w, depth, fill=PAL["wall2"])
        self.line(x, y, x + w, y, PAL["line_dk"], 1.4)
        self.line(x, y + depth * 0.45, x + w, y + depth * 0.45, PAL["white"], 1.2)
        self.line(x, y + depth, x + w, y + depth, PAL["line_dk"], 1.2)

    def herringbone(self, x, y, w, h, scale=1.0):
        pid = self.uid("hb")
        s = 40 * scale
        self.defs_add(
            f'<pattern id="{pid}" width="{s*2}" height="{s}" patternUnits="userSpaceOnUse">'
            f'<rect width="{s*2}" height="{s}" fill="{PAL["wood_lt"]}"/>'
            f'<path d="M0 {s} L{s} 0 M{s} 0 L{s*2} {s} M{-s/2} {s/2} L0 0 M{s*1.5} {s*1.5} L{s*2.5} {s/2}" stroke="{PAL["wood"]}" stroke-width="{1.4*scale}" fill="none"/>'
            f'<path d="M{s/2} {s} L{s} {s/2} L{s*1.5} {s}" stroke="{PAL["wood_dk"]}" stroke-width="{0.8*scale}" fill="none" opacity="0.5"/>'
            f'</pattern>')
        self.rect(x, y, w, h, fill=f"url(#{pid})", op=0.75)
        self.rect(x, y, w, h, fill=self.lin_grad([(0, PAL["wood_dk"], 0.25), (0.4, PAL["wood_dk"], 0), (1, PAL["paper"], 0.25)]))

    def tiles(self, x, y, w, h, size=60, col=None):
        col = col or PAL["sage_dk"]
        pid = self.uid("tl")
        s = size
        m = s / 2
        self.defs_add(
            f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse">'
            f'<rect width="{s}" height="{s}" fill="{PAL["marble"]}"/>'
            f'<path d="M{m} {s*0.18} Q{s*0.62} {m} {m} {s*0.82} Q{s*0.38} {m} {m} {s*0.18}Z M{s*0.18} {m} Q{m} {s*0.38} {s*0.82} {m} Q{m} {s*0.62} {s*0.18} {m}Z" fill="{col}" opacity="0.55"/>'
            f'<circle cx="{m}" cy="{m}" r="{s*0.06}" fill="{PAL["gold"]}" opacity="0.6"/>'
            f'<rect width="{s}" height="{s}" fill="none" stroke="{PAL["line"]}" stroke-width="1"/></pattern>')
        self.rect(x, y, w, h, fill=f"url(#{pid})")

    # ——— tükrök és világítás ———
    def mirror_arched(self, cx, top, w, bottom, frame=14):
        x0, x1 = cx - w / 2, cx + w / 2
        r = w / 2
        spring = top + r
        d = f"M{x0:.1f} {bottom:.1f} L{x0:.1f} {spring:.1f} A{r:.1f} {r:.1f} 0 0 1 {x1:.1f} {spring:.1f} L{x1:.1f} {bottom:.1f} Z"
        glass = self.lin_grad([(0, "#F7F6F1", 1), (0.55, PAL["glass"], 1), (1, "#D9DED6", 1)], 0, 0, 1, 1)
        self.path(d, fill=glass)
        # tükröződő ablak halvány körvonala
        self.group(lambda: (
            self.rect(cx - w * 0.28, spring + 10, w * 0.32, (bottom - spring) * 0.8, stroke=PAL["white"], sw=6, op=0.55),
            self.line(cx - w * 0.12, spring + 10, cx - w * 0.12, spring + (bottom - spring) * 0.8 + 10, PAL["white"], 4, 0.5),
            self.path(f"M{x0+30:.1f} {bottom-40:.1f} L{x1-60:.1f} {spring-r*0.2:.1f}", stroke=PAL["white"], sw=10, op=0.35),
        ), clip=self.clip(f'<path d="{d}"/>'))
        gold = self.lin_grad([(0, PAL["gold_lt"], 1), (0.5, PAL["gold"], 1), (1, PAL["gold_dk"], 1)], 0, 0, 1, 1)
        self.path(d, stroke=gold, sw=frame)
        self.path(d, stroke=PAL["gold_dk"], sw=1.2, op=0.7, extra=f'transform="translate(0 0)"')
        # kis díszítés a csúcson
        self.path(f"M{cx-26:.1f} {top-4:.1f} Q{cx:.1f} {top-40:.1f} {cx+26:.1f} {top-4:.1f}", stroke=gold, sw=5)
        self.circle(cx, top - 26, 6, PAL["gold"])

    def mirror_oval(self, cx, cy, rx, ry, frame=18, crest=True):
        glass = self.lin_grad([(0, "#F7F6F1", 1), (0.6, PAL["glass"], 1), (1, "#D5DBD2", 1)], 0, 0, 1, 1)
        self.ellipse(cx, cy, rx, ry, glass)
        cid = self.clip(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
        self.group(lambda: (
            self.path(f"M{cx-rx:.1f} {cy+ry*0.5:.1f} L{cx+rx*0.4:.1f} {cy-ry:.1f}", stroke=PAL["white"], sw=16, op=0.35),
            self.path(f"M{cx-rx*0.6:.1f} {cy+ry:.1f} L{cx+rx:.1f} {cy-ry*0.3:.1f}", stroke=PAL["white"], sw=6, op=0.3),
        ), clip=cid)
        gold = self.lin_grad([(0, PAL["gold_lt"], 1), (0.5, PAL["gold"], 1), (1, PAL["gold_dk"], 1)], 0, 0, 1, 1)
        self.ellipse(cx, cy, rx + frame / 2, ry + frame / 2, "none", stroke=gold, sw=frame)
        self.ellipse(cx, cy, rx + frame + 2, ry + frame + 2, "none", stroke=PAL["gold_dk"], sw=1.4, op=0.6)
        # gyöngysor a kereten
        for i in range(36):
            a = 2 * math.pi * i / 36
            self.circle(cx + math.cos(a) * (rx + frame / 2), cy + math.sin(a) * (ry + frame / 2), 2.2, PAL["gold_lt"], 0.9)
        if crest:
            t = cy - ry - frame
            for side in (-1, 1):
                self.path(f"M{cx:.1f} {t+6:.1f} C{cx+side*20:.1f} {t-30:.1f} {cx+side*60:.1f} {t-10:.1f} {cx+side*48:.1f} {t+14:.1f} "
                          f"C{cx+side*40:.1f} {t+26:.1f} {cx+side*26:.1f} {t+12:.1f} {cx+side*34:.1f} {t+4:.1f}", stroke=gold, sw=6)
            self.path(f"M{cx-14:.1f} {t+4:.1f} Q{cx:.1f} {t-46:.1f} {cx+14:.1f} {t+4:.1f}Z", fill=gold)
            b = cy + ry + frame
            for side in (-1, 1):
                self.path(f"M{cx:.1f} {b-6:.1f} C{cx+side*16:.1f} {b+20:.1f} {cx+side*40:.1f} {b+6:.1f} {cx+side*34:.1f} {b-8:.1f}", stroke=gold, sw=5)

    def sconce(self, x, y, s=1.0, glow=True):
        if glow:
            g = self.rad_grad([(0, "#FFF6DF", 0.9), (0.5, "#F8E9C4", 0.35), (1, "#F8E9C4", 0)])
            self.circle(x, y - 10 * s, 120 * s, g)
        gold = PAL["gold"]
        self.rect(x - 9 * s, y + 18 * s, 18 * s, 46 * s, fill=gold, rx=8 * s)
        self.path(f"M{x:.1f} {y+40*s:.1f} Q{x-30*s:.1f} {y+40*s:.1f} {x-28*s:.1f} {y+8*s:.1f}", stroke=gold, sw=5 * s)
        self.path(f"M{x-28*s:.1f} {y+10*s:.1f} L{x-28*s:.1f} {y-2*s:.1f}", stroke=gold, sw=4 * s)
        # rakott ernyő
        sx = x - 28 * s
        top, bot = y - 52 * s, y - 2 * s
        d = f"M{sx-20*s:.1f} {top:.1f} L{sx+20*s:.1f} {top:.1f} L{sx+34*s:.1f} {bot:.1f} L{sx-34*s:.1f} {bot:.1f}Z"
        self.path(d, fill=PAL["shade"], stroke=PAL["line_dk"], sw=1.2)
        for i in range(-5, 6):
            self.line(sx + i * 3.6 * s, top + 2, sx + i * 6.2 * s, bot - 1, PAL["line"], 0.9, 0.9)

    def chandelier(self, cx, top, s=1.0):
        gold = PAL["gold"]
        self.line(cx, 0, cx, top + 40 * s, gold, 3 * s)
        g = self.rad_grad([(0, "#FFF6DF", 0.85), (0.6, "#F8E9C4", 0.25), (1, "#F8E9C4", 0)])
        self.circle(cx, top + 110 * s, 190 * s, g)
        self.ellipse(cx, top + 60 * s, 16 * s, 26 * s, gold)
        for i, a in enumerate([-1, -0.55, -0.18, 0.18, 0.55, 1]):
            ex = cx + a * 130 * s
            ey = top + 100 * s - abs(a) * 10 * s
            self.path(f"M{cx:.1f} {top+80*s:.1f} Q{cx+a*60*s:.1f} {top+150*s:.1f} {ex:.1f} {ey:.1f}", stroke=gold, sw=3.5 * s)
            self.rect(ex - 5 * s, ey - 26 * s, 10 * s, 24 * s, fill=PAL["white"], rx=2)
            self.ellipse(ex, ey - 32 * s, 3.4 * s, 6 * s, "#F3D28B", 0.95)
            for k in range(3):
                self.circle(ex + (k - 1) * 5 * s, ey + 18 * s + k % 2 * 8 * s, 3.2 * s, PAL["white"], 0.9, PAL["line"], 0.6)
        self.circle(cx, top + 150 * s, 6 * s, PAL["white"], 0.9, PAL["line"], 0.6)

    # ——— bútorok ———
    def cabinet(self, x, y, w, h, top_h=20, doors=2, drawers=1, color=None, top="marble", legs=10):
        color = color or PAL["sage"]
        tc = PAL["marble"] if top == "marble" else PAL["wood"]
        self.rect(x - 10, y, w + 20, top_h, fill=tc, stroke=PAL["line_dk"], sw=1.2)
        if top == "marble":
            for _ in range(4):
                vx = x + self.r.uniform(0, w)
                self.path(f"M{vx:.1f} {y+2:.1f} q{self.r.uniform(-20,20):.1f} {top_h*0.4:.1f} {self.r.uniform(-30,30):.1f} {top_h-4:.1f}", stroke=PAL["vein"], sw=1)
        body_y = y + top_h
        body_h = h - top_h - legs
        self.rect(x, body_y, w, body_h, fill=color, stroke=PAL["sage_dk"], sw=1.4)
        self.rect(x, body_y, w, body_h, fill=self.lin_grad([(0, "#FFFFFF", 0.18), (1, "#000000", 0.08)]))
        dh = body_h * 0.22 if drawers else 0
        for i in range(drawers):
            dw = (w - 24 - (drawers - 1) * 10) / drawers
            dx = x + 12 + i * (dw + 10)
            self.rect(dx, body_y + 10, dw, dh - 14, stroke=PAL["sage_dk"], sw=1.2)
            self.rect(dx + dw / 2 - 14, body_y + 10 + (dh - 14) / 2 - 2, 28, 4, fill=PAL["gold"], rx=2)
        dy = body_y + dh + 4
        ddh = body_h - dh - 14
        if doors:
            dw = (w - 24 - (doors - 1) * 8) / doors
            for i in range(doors):
                dx = x + 12 + i * (dw + 8)
                self.rect(dx, dy, dw, ddh, stroke=PAL["sage_dk"], sw=1.2)
                self.rect(dx + 10, dy + 10, dw - 20, ddh - 20, stroke=PAL["sage_lt"], sw=1.6)
                kx = dx + dw - 14 if i % 2 == 0 else dx + 14
                self.circle(kx, dy + ddh / 2, 4.5, PAL["gold"])
        for lx in (x + 8, x + w - 20):
            self.rect(lx, y + h - legs, 12, legs, fill=PAL["sage_dk"])

    def vase(self, cx, base, h, w, color=PAL["white"], band=None):
        d = (f"M{cx-w*0.22:.1f} {base:.1f} Q{cx-w*0.62:.1f} {base-h*0.45:.1f} {cx-w*0.3:.1f} {base-h*0.86:.1f} "
             f"L{cx-w*0.24:.1f} {base-h:.1f} L{cx+w*0.24:.1f} {base-h:.1f} L{cx+w*0.3:.1f} {base-h*0.86:.1f} "
             f"Q{cx+w*0.62:.1f} {base-h*0.45:.1f} {cx+w*0.22:.1f} {base:.1f}Z")
        self.path(d, fill=color, stroke=PAL["line_dk"], sw=1.2)
        if band:
            self.path(f"M{cx-w*0.45:.1f} {base-h*0.5:.1f} Q{cx:.1f} {base-h*0.44:.1f} {cx+w*0.45:.1f} {base-h*0.5:.1f}", stroke=band, sw=h * 0.12, op=0.55)
            for i in range(-2, 3):
                self.circle(cx + i * w * 0.16, base - h * 0.66, w * 0.035, band, 0.6)
        self.path(d, fill=self.lin_grad([(0, "#000000", 0), (1, "#000000", 0.08)], 0, 0, 1, 0))

    def books(self, x, base, cols=None):
        cols = cols or [PAL["sage_dk"], PAL["blush"], PAL["linen"], PAL["toile"]]
        y = base
        for i, c in enumerate(cols):
            h = 12 + (i % 2) * 4
            w = 120 - i * 10
            self.rect(x + i * 4, y - h, w, h, fill=c, stroke=PAL["line_dk"], sw=0.8, rx=1)
            y -= h

    def frame_landscape(self, x, y, w, h, frame=12):
        self.rect(x, y, w, h, fill=PAL["gold"], stroke=PAL["gold_dk"], sw=1.2)
        self.rect(x + frame, y + frame, w - 2 * frame, h - 2 * frame, fill=PAL["white"])
        ix, iy, iw, ih = x + frame + 14, y + frame + 14, w - 2 * frame - 28, h - 2 * frame - 28
        cid = self.clip(f'<rect x="{ix}" y="{iy}" width="{iw}" height="{ih}"/>')

        def land():
            self.rect(ix, iy, iw, ih, fill=PAL["sky"])
            self.path(f"M{ix} {iy+ih*0.55} Q{ix+iw*0.3} {iy+ih*0.35} {ix+iw*0.55} {iy+ih*0.5} T{ix+iw} {iy+ih*0.45} L{ix+iw} {iy+ih} L{ix} {iy+ih}Z", fill=PAL["hill"])
            self.path(f"M{ix} {iy+ih*0.72} Q{ix+iw*0.4} {iy+ih*0.58} {ix+iw} {iy+ih*0.7} L{ix+iw} {iy+ih} L{ix} {iy+ih}Z", fill=PAL["hill2"], op=0.8)
            self.rect(ix, iy + ih * 0.82, iw, ih * 0.18, fill=PAL["water"], op=0.7)
        self.group(land, clip=cid)
        self.rect(ix, iy, iw, ih, stroke=PAL["line_dk"], sw=1)

    def reeds(self, x0, x1, base, height, n=40, col=None):
        R = self.r
        col = col or PAL["sage_dk"]
        for _ in range(n):
            x = R.uniform(x0, x1)
            h = height * R.uniform(0.5, 1.0)
            lean = R.uniform(-0.25, 0.25) * h
            self.path(f"M{x:.1f} {base:.1f} Q{x+lean*0.3:.1f} {base-h*0.6:.1f} {x+lean:.1f} {base-h:.1f}", stroke=col, sw=R.uniform(1.2, 2.6), op=R.uniform(0.5, 0.9))
            if R.random() < 0.35:
                self.ellipse(x + lean, base - h - 8, 3.5, 12, PAL["wood_dk"], 0.7, extra=f'transform="rotate({math.degrees(math.atan2(lean, h)):.1f} {x+lean:.1f} {base-h-8:.1f})"')

    def water_lines(self, x0, x1, y0, y1, n=40, col=None):
        R = self.r
        col = col or PAL["water_dk"]
        for i in range(n):
            y = y0 + (y1 - y0) * (i / n) ** 1.6
            xa = R.uniform(x0, x1 - 60)
            ln = R.uniform(40, 240) * (0.5 + (y - y0) / (y1 - y0))
            self.path(f"M{xa:.1f} {y:.1f} q{ln/2:.1f} {-2:.1f} {ln:.1f} 0", stroke=col, sw=R.uniform(0.8, 2.0), op=R.uniform(0.3, 0.7))

    def sailboat(self, x, y, s=1.0):
        self.path(f"M{x-30*s:.1f} {y:.1f} L{x+34*s:.1f} {y:.1f} L{x+24*s:.1f} {y+8*s:.1f} L{x-22*s:.1f} {y+8*s:.1f}Z", fill=PAL["ink"], op=0.55)
        self.line(x, y, x, y - 70 * s, PAL["ink"], 1.6 * s, 0.6)
        self.path(f"M{x+2*s:.1f} {y-68*s:.1f} L{x+30*s:.1f} {y-6*s:.1f} L{x+2*s:.1f} {y-6*s:.1f}Z", fill=PAL["white"], stroke=PAL["line_dk"], sw=1)
        self.path(f"M{x-2*s:.1f} {y-56*s:.1f} L{x-22*s:.1f} {y-6*s:.1f} L{x-2*s:.1f} {y-6*s:.1f}Z", fill=PAL["linen"], stroke=PAL["line_dk"], sw=1)

    # ——— kész kép ———
    def svg(self, grain=True):
        g = ""
        if grain:
            self.defs_add(
                '<filter id="grain" x="0" y="0" width="100%" height="100%">'
                '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/>'
                '<feColorMatrix type="saturate" values="0"/>'
                '<feComponentTransfer><feFuncA type="linear" slope="0" intercept="0.07"/></feComponentTransfer>'
                '</filter>')
            g = f'<rect width="{self.w}" height="{self.h}" filter="url(#grain)" style="mix-blend-mode:multiply"/>'
            vig = self.rad_grad([(0.55, "#000000", 0), (1, "#3B3226", 0.14)], 0.5, 0.48, 0.75)
            g += f'<rect width="{self.w}" height="{self.h}" fill="{vig}"/>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}">'
                f'<defs>{"".join(self.defs)}</defs><rect width="{self.w}" height="{self.h}" fill="{self.bg}"/>'
                + "".join(self.body) + g + "</svg>")
