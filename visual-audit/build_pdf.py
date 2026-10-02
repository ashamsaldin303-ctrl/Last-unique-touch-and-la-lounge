#!/usr/bin/env python3
# build_pdf.py — LUT Luxury Visual Atlas builder
# Converts captured viewport PNGs → organized RTL Arabic HTML (fixed A4 pages) → vector PDF
# Layout: cover + guide + TOC + Part I (PC 1440×900) + Part II (Mobile 375×812) + ending
# Image pages: 2 segments per page (PC stacked, Mobile side-by-side).

import os, re, sys, datetime
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
PC_PNG = os.path.join(BASE, "shots-pc")
MO_PNG = os.path.join(BASE, "shots-mobile")
PC_JPG = os.path.join(BASE, "shots-pc-jpg")
MO_JPG = os.path.join(BASE, "shots-mobile-jpg")
OUT_HTML = os.path.join(BASE, "atlas.html")
CONSOLE_LOG = os.path.join(BASE, "shots-pc", "console-errors.log")
CONSOLE_LOG_MO = os.path.join(BASE, "shots-mobile", "console-errors.log")

PAGE_W, PAGE_H = 794, 1123
JPEG_Q = 82

# ---------- design tokens ----------
C = {
    "bg":     "#15110D",  # warm near-black
    "panel":  "#1E1913",
    "panel2": "#241D15",
    "line":   "rgba(201,162,75,.28)",
    "text":   "#F2EDE3",
    "muted":  "#9A9086",
    "gold":   "#C9A24B",
    "gold2":  "#E5C878",
    "lut":    "#E62129",
    "ll":     "#E6007E",
    "bd":     "#F5B914",
}

SECTIONS = [
    dict(key="s1", title="الصفحة الرئيسية", en="Home", color=C["gold"],
         routes=[("home", "الرئيسية — العربية", "#/ar"),
                 ("home-en", "الرئيسية — English", "#/en")]),
    dict(key="s2", title="Last Unique Touch — اللمسة الأخيرة الفريدة", en="LUT", color=C["lut"],
         routes=[("lut", "صفحة العلامة", "#/ar/last-unique-touch"),
                 ("lut-contact", "تواصل LUT", "#/ar/last-unique-touch/contact")]),
    dict(key="s3", title="La Lounge — لا لاونج", en="La Lounge", color=C["ll"],
         routes=[("la-lounge", "صفحة العلامة", "#/ar/la-lounge"),
                 ("la-lounge-custom", "أثاث مخصص", "#/ar/la-lounge/custom-furniture"),
                 ("la-lounge-event", "تخطيط الفعاليات", "#/ar/la-lounge/event-planning"),
                 ("la-lounge-plans", "خطط جاهزة", "#/ar/la-lounge/ready-plans"),
                 ("la-lounge-contact", "تواصل", "#/ar/la-lounge/contact")]),
    dict(key="s4", title="Your Birthday — عيد ميلادك", en="Your Birthday", color=C["bd"],
         routes=[("birthday", "صفحة العلامة", "#/ar/your-birthday"),
                 ("birthday-features", "المميزات", "#/ar/your-birthday/features"),
                 ("birthday-products", "المنتجات", "#/ar/your-birthday/products"),
                 ("birthday-contact", "تواصل", "#/ar/your-birthday/contact")]),
    dict(key="s5", title="المتجر ورحلة الشراء", en="Shop & Checkout", color=C["gold"],
         routes=[("products", "كل المنتجات", "#/ar/products"),
                 ("product-lut", "منتج — أباجورة ذهبية أرضية", "#/ar/products/gold-floor-lamp"),
                 ("product-lalounge", "منتج — السجادة الحمراء VIP", "#/ar/products/red-carpet"),
                 ("product-birthday", "منتج — رقصصة LED", "#/ar/products/led-dance-floor"),
                 ("cart-empty", "السلة (فارغة)", "#/ar/cart"),
                 ("cart-filled", "السلة (مع منتج)", "#/ar/cart"),
                 ("checkout", "إتمام الطلب", "#/ar/checkout"),
                 ("payment", "الدفع", "#/ar/checkout/payment"),
                 ("checkout-success", "نجاح الطلب", "#/ar/checkout/success")]),
    dict(key="s6", title="صفحات عامة وقانونية", en="General & Legal", color=C["gold"],
         routes=[("about", "من نحن", "#/ar/about"),
                 ("contact", "تواصل معنا", "#/ar/contact"),
                 ("privacy", "سياسة الخصوصية", "#/ar/privacy"),
                 ("terms", "الشروط والأحكام", "#/ar/terms"),
                 ("refund", "سياسة الاسترجاع", "#/ar/refund")]),
]

VIEWPORTS = {
    "pc": dict(label="سطح المكتب", spec="PC · 1440×900", w=1440, h=900, jpg=PC_JPG, png=PC_PNG),
    "mo": dict(label="الجوال", spec="Mobile · 375×812", w=375, h=812, jpg=MO_JPG, png=MO_PNG),
}


# ---------- 1) PNG → JPEG ----------
def convert_shots(png_dir, jpg_dir):
    os.makedirs(jpg_dir, exist_ok=True)
    out = {}
    if not os.path.isdir(png_dir):
        return out
    for f in sorted(os.listdir(png_dir)):
        if not f.endswith(".png"):
            continue
        key = f[:-4]
        src = os.path.join(png_dir, f)
        dst = os.path.join(jpg_dir, key + ".jpg")
        with Image.open(src) as im:
            w, h = im.size
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                im.convert("RGB").save(dst, "JPEG", quality=JPEG_Q, optimize=True)
        out[key] = dict(file=f"{os.path.basename(jpg_dir)}/{key}.jpg", w=w, h=h)
    return out


def segment_list(inventory, route_key):
    pat = re.compile(r"^" + re.escape(route_key) + r"-(\d+)$")
    return sorted([k for k in inventory if pat.match(k)], key=lambda k: int(pat.match(k).group(1)))


# ---------- 2) page records ----------
def build():
    inv = {vp: convert_shots(v["png"], v["jpg"]) for vp, v in VIEWPORTS.items()}

    # inventory per route
    routes_inv = {}
    missing = []
    for sec in SECTIONS:
        for rkey, rname, rpath in sec["routes"]:
            routes_inv[rkey] = {
                "name": rname, "path": rpath, "sec": sec,
                "pc": segment_list(inv["pc"], rkey),
                "mo": segment_list(inv["mo"], rkey),
            }
            if not routes_inv[rkey]["pc"] and not routes_inv[rkey]["pc"]:
                missing.append(rkey)

    total_pc = sum(len(r["pc"]) for r in routes_inv.values())
    total_mo = sum(len(r["mo"]) for r in routes_inv.values())
    n_routes = sum(len(s["routes"]) for s in SECTIONS)

    today = datetime.date.today().strftime("%Y/%m/%d")

    # ---- page sequence (numbers deterministic) ----
    pages = []  # list of dicts: kind, ...

    def pno():
        return len(pages) + 1

    # cover (1), guide (1)
    pages.append(dict(kind="cover"))
    pages.append(dict(kind="guide"))

    # TOC: 1 page per part (2-column)
    pages.append(dict(kind="toc", part="pc"))
    pages.append(dict(kind="toc", part="mo"))

    # part I: pc
    pages.append(dict(kind="part", part="pc"))
    part_pages = {"pc": {}, "mo": {}}
    for part in ("pc", "mo"):
        for sec in SECTIONS:
            pages.append(dict(kind="section", part=part, sec=sec))
            for rkey, rname, rpath in sec["routes"]:
                segs = routes_inv[rkey][part]
                n_imgpages = max(1, (len(segs) + 1) // 2) if segs else 0
                first = None
                for i in range(0, len(segs), 2):
                    pages.append(dict(kind="img", part=part, sec=sec, rkey=rkey,
                                      segs=segs[i:i + 2], idx=i, total=len(segs),
                                      first=(i == 0)))
                if segs:
                    part_pages[part][rkey] = (pages[len(pages) - n_imgpages]["p"] if False else None)
                # record page numbers
        # placeholder replaced below
    # recompute numbers (pages list index+1)
    for i, pg in enumerate(pages):
        pg["p"] = i + 1

    # route start pages for TOC
    route_start = {}
    for pg in pages:
        if pg["kind"] == "img" and pg.get("first"):
            route_start[(pg["part"], pg["rkey"])] = pg["p"]
    section_start = {}
    for pg in pages:
        if pg["kind"] == "section":
            section_start[(pg["part"], pg["sec"]["key"])] = pg["p"]

    pages.append(dict(kind="ending"))
    for i, pg in enumerate(pages):
        pg["p"] = i + 1

    # console errors summary
    err_count = 0
    err_samples = []
    for lg in (CONSOLE_LOG, CONSOLE_LOG_MO):
        if os.path.isfile(lg):
            txt = open(lg, encoding="utf-8", errors="ignore").read()
            for line in txt.splitlines():
                if re.search(r"\b(error|Error|ERROR|unhandled|Uncaught)\b", line):
                    err_count += 1
                    if len(err_samples) < 5:
                        err_samples.append(line.strip()[:120])

    total_pages = len(pages)

    # ---------- 3) render HTML ----------
    H = []
    H.append(f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>أطلس الموقع البصري — LUT Luxury</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@700&display=swap" rel="stylesheet">
<style>
@page {{ size: {PAGE_W}px {PAGE_H}px; margin: 0; }}
html, body {{ margin: 0; padding: 0; width: {PAGE_W}px; background: {C['bg']}; color: {C['text']};
  font-family: 'Tajawal', sans-serif; }}
@media screen {{
  html {{ height: auto; display: flex; justify-content: center; background: #0C0A08; }}
  body {{ transform-origin: top center; scale: min(1, calc(100vw / {PAGE_W})); margin: 0 auto;
    box-shadow: 0 0 60px rgba(0,0,0,.5); }}
}}
.page {{ width: {PAGE_W}px; height: {PAGE_H}px; position: relative; background: {C['bg']};
  break-after: page; display: flex; flex-direction: column; box-sizing: border-box; }}
.page:last-child {{ break-after: auto; }}
img {{ display: block; }}
.mono {{ font-family: 'Tajawal', sans-serif; letter-spacing: .02em; }}

/* ---- image pages ---- */
.phead {{ display: flex; justify-content: space-between; align-items: center;
  padding: 18px 32px 10px; }}
.ph-r {{ display: flex; align-items: center; gap: 8px; min-width: 0; }}
.dot {{ width: 9px; height: 9px; border-radius: 50%; flex: none; }}
.ph-name {{ font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.ph-l {{ display: flex; align-items: center; gap: 10px; direction: ltr; }}
.ph-path {{ font-size: 10px; color: {C['muted']}; }}
.ph-chip {{ font-size: 10px; color: {C['gold2']}; border: 1px solid {C['line']};
  border-radius: 99px; padding: 2px 8px; white-space: nowrap; }}
.pfoot {{ display: flex; justify-content: space-between; align-items: center;
  padding: 10px 32px 16px; font-size: 10px; color: {C['muted']}; }}
.pnum {{ color: {C['gold2']}; font-weight: 700; }}
.hair {{ height: 1px; background: {C['line']}; margin: 0 32px; }}

.route-banner {{ margin: 2px 32px 0; padding: 10px 14px; background: {C['panel']};
  border: 1px solid {C['line']}; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }}
.rb-r {{ font-weight: 800; font-size: 15px; }}
.rb-l {{ display: flex; gap: 10px; align-items: center; font-size: 10px; color: {C['muted']}; direction: ltr; }}
.rb-count {{ color: {C['gold2']}; font-weight: 700; }}

.frames {{ flex: 1; display: flex; justify-content: center; align-content: center; flex-wrap: wrap;
  gap: 14px; padding: 14px 32px; box-sizing: border-box; }}
.frame {{ margin: 0; }}
.frame img {{ border: 1px solid {C['line']}; border-radius: 6px; background: #000; }}
.frame figcaption {{ display: flex; justify-content: space-between; margin-top: 6px;
  font-size: 10px; color: {C['muted']}; }}
.f-pc img {{ width: 730px; }}
.f-mo img {{ width: 358px; }}
.fg-num {{ color: {C['gold2']}; font-weight: 700; }}

/* ---- cover ---- */
.cover {{ justify-content: center; padding: 60px 56px; box-sizing: border-box; }}
.cv-ring {{ position: absolute; top: 8%; left: 10%; width: 180px; height: 180px;
  border: 1px solid {C['line']}; border-radius: 50%; opacity: .5; }}
.cv-ring2 {{ position: absolute; top: 12%; left: 13.5%; width: 110px; height: 110px;
  border: 1px solid rgba(201,162,75,.18); border-radius: 50%; opacity: .5; }}
.cv-top {{ display: flex; gap: 10px; align-items: center; margin-bottom: 26px; }}
.cv-badge {{ font-size: 10px; color: {C['gold2']}; border: 1px solid {C['line']};
  border-radius: 99px; padding: 4px 12px; }}
.cv-title {{ font-family: 'Amiri', 'Tajawal', serif; font-weight: 700; font-size: 58px;
  line-height: 1.15; color: {C['gold2']}; margin: 0 0 12px; }}
.cv-sub {{ font-size: 16px; color: {C['text']}; opacity: .85; line-height: 1.8; margin-bottom: 30px; }}
.cv-brands {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 34px; }}
.cv-brand {{ display: flex; align-items: center; gap: 8px; font-size: 12px;
  border: 1px solid {C['line']}; background: {C['panel']}; border-radius: 99px; padding: 7px 14px; }}
.cv-stats {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }}
.cv-stat {{ background: {C['panel']}; border: 1px solid {C['line']}; border-radius: 10px;
  padding: 14px 10px; text-align: center; }}
.cv-n {{ font-size: 24px; font-weight: 800; color: {C['gold2']}; }}
.cv-l {{ font-size: 10.5px; color: {C['muted']}; margin-top: 3px; }}
.cv-foot {{ position: absolute; bottom: 44px; right: 56px; left: 56px;
  display: flex; justify-content: space-between; font-size: 10.5px; color: {C['muted']};
  border-top: 1px solid {C['line']}; padding-top: 14px; }}

/* ---- guide ---- */
.gd {{ padding: 70px 56px; }}
.gd-tag {{ font-size: 11px; color: {C['gold2']}; letter-spacing: .12em; margin-bottom: 10px; }}
.gd-title {{ font-family: 'Amiri', 'Tajawal', serif; font-size: 34px; font-weight: 700;
  color: {C['text']}; margin: 0 0 8px; }}
.gd-sub {{ font-size: 13px; color: {C['muted']}; margin-bottom: 28px; line-height: 1.8; }}
.gd-card {{ background: {C['panel']}; border: 1px solid {C['line']}; border-radius: 12px;
  padding: 20px 22px; margin-bottom: 16px; }}
.gd-h {{ display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 15px;
  margin-bottom: 10px; }}
.gd-n {{ width: 26px; height: 26px; border-radius: 8px; background: {C['panel2']};
  color: {C['gold2']}; font-size: 13px; font-weight: 800; display: flex; align-items: center;
  justify-content: center; border: 1px solid {C['line']}; flex: none; }}
.gd-p {{ font-size: 12.5px; line-height: 2.05; color: {C['text']}; opacity: .9; margin: 0; }}

/* ---- TOC ---- */
.toc {{ padding: 56px 56px; }}
.toc-title {{ font-family: 'Amiri', 'Tajawal', serif; font-size: 30px; font-weight: 700; margin: 0 0 4px; }}
.toc-sub {{ font-size: 12px; color: {C['muted']}; margin-bottom: 24px; }}
.toc-cols {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 28px; }}
.toc-sec {{ display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 12.5px;
  margin: 10px 0 4px; grid-column: 1 / -1; }}
.toc-sec .t-line {{ flex: 1; height: 1px; background: {C['line']}; }}
.trow {{ display: flex; align-items: baseline; gap: 8px; font-size: 11.5px; padding: 3.5px 0; }}
.trow .t-dots {{ flex: 1; border-bottom: 1px dotted rgba(154,144,134,.35); transform: translateY(-3px); }}
.trow .t-p {{ color: {C['gold2']}; font-weight: 700; font-size: 11px; min-width: 22px; text-align: left; }}

/* ---- part divider ---- */
.part {{ justify-content: center; padding: 0 56px; }}
.pt-ghost {{ position: absolute; top: 6%; left: 4%; font-size: 210px; font-weight: 800;
  color: rgba(201,162,75,.07); line-height: 1; font-family: 'Tajawal', sans-serif; }}
.pt-kicker {{ font-size: 11px; letter-spacing: .14em; color: {C['gold2']}; margin-bottom: 14px; }}
.pt-title {{ font-family: 'Amiri', 'Tajawal', serif; font-size: 46px; font-weight: 700; margin: 0 0 10px; }}
.pt-sub {{ font-size: 15px; color: {C['text']}; opacity: .85; margin-bottom: 30px; line-height: 1.9; }}
.pt-specs {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 26px; }}
.pt-spec {{ border: 1px solid {C['line']}; background: {C['panel']}; border-radius: 10px;
  padding: 12px 18px; text-align: center; min-width: 120px; }}
.pt-spec .n {{ font-size: 18px; font-weight: 800; color: {C['gold2']}; }}
.pt-spec .l {{ font-size: 10px; color: {C['muted']}; margin-top: 3px; }}

/* ---- section divider ---- */
.section {{ justify-content: center; padding: 0 56px; }}
.sn-ghost {{ position: absolute; top: 10%; left: 6%; font-size: 130px; font-weight: 800;
  color: rgba(201,162,75,.06); line-height: 1; }}
.sn-bar {{ width: 52px; height: 3px; border-radius: 2px; margin-bottom: 16px; }}
.sn-en {{ font-size: 11px; letter-spacing: .18em; color: {C['muted']}; margin-bottom: 8px; direction: ltr; text-align: right; }}
.sn-title {{ font-family: 'Amiri', 'Tajawal', serif; font-size: 34px; font-weight: 700; margin: 0 0 24px; }}
.sn-list {{ list-style: none; margin: 0; padding: 0; max-width: 560px; }}
.sn-li {{ display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 13px;
  border-bottom: 1px solid rgba(201,162,75,.12); }}
.sn-li:last-child {{ border-bottom: none; }}
.sn-li .s-path {{ font-size: 10px; color: {C['muted']}; direction: ltr; margin-right: auto; }}
.sn-li .s-p {{ color: {C['gold2']}; font-weight: 700; font-size: 11px; }}

/* ---- ending ---- */
.end {{ justify-content: center; align-items: center; text-align: center; padding: 0 70px; }}
.end-title {{ font-family: 'Amiri', 'Tajawal', serif; font-size: 40px; font-weight: 700;
  color: {C['gold2']}; margin: 18px 0 10px; }}
.end-sub {{ font-size: 13.5px; color: {C['muted']}; line-height: 2.1; max-width: 480px; }}
.end-stats {{ display: flex; gap: 40px; margin: 30px 0 26px; }}
.end-st {{ text-align: center; }}
.end-st .n {{ font-size: 26px; font-weight: 800; color: {C['gold2']}; }}
.end-st .l {{ font-size: 10.5px; color: {C['muted']}; margin-top: 4px; }}
.end-brands {{ font-size: 11.5px; color: {C['text']}; opacity: .75; letter-spacing: .06em; }}
</style>
</head>
<body>
""")

    def fmt(v):
        return f"{v:,}".replace(",", "،")

    for pg in pages:
        k = pg["kind"]
        if k == "cover":
            H.append(f"""
<div class="page cover">
  <div class="cv-ring"></div><div class="cv-ring2"></div>
  <div class="cv-top">
    <span class="cv-badge">وثيقة تحليل بصري · AI Vision</span>
    <span class="cv-badge">{today}</span>
  </div>
  <h1 class="cv-title">أطلس الموقع البصري</h1>
  <div class="cv-sub">لقطات شاشة كاملة لجميع صفحات المنصة كما تظهر على سطح المكتب وعلى الجوال،<br>مرتّبة الأقسام والمسارات وجاهزة للتحليل البصري بنماذج الذكاء الاصطناعي.</div>
  <div class="cv-brands">
    <span class="cv-brand"><span class="dot" style="background:{C['lut']}"></span>Last Unique Touch</span>
    <span class="cv-brand"><span class="dot" style="background:{C['ll']}"></span>La Lounge</span>
    <span class="cv-brand"><span class="dot" style="background:{C['bd']}"></span>Your Birthday</span>
  </div>
  <div class="cv-stats">
    <div class="cv-stat"><div class="cv-n">{fmt(n_routes)}</div><div class="cv-l">مساراً مصوّراً</div></div>
    <div class="cv-stat"><div class="cv-n">{fmt(total_pc)}</div><div class="cv-l">لقطة سطح مكتب</div></div>
    <div class="cv-stat"><div class="cv-n">{fmt(total_mo)}</div><div class="cv-l">لقطة جوال</div></div>
    <div class="cv-stat"><div class="cv-n">{fmt(total_pages)}</div><div class="cv-l">صفحة في الملف</div></div>
    <div class="cv-stat"><div class="cv-n" style="font-size:15px;padding-top:5px">1440×900<br>375×812</div><div class="cv-l">أبعاد الالتقاط</div></div>
    <div class="cv-stat"><div class="cv-n" style="font-size:15px;padding-top:5px">{C['bg']}</div><div class="cv-l">نسخة فاخرة داكنة</div></div>
  </div>
  <div class="cv-foot"><span>Last Unique Touch · La Lounge · Your Birthday — الكويت</span><span>visual atlas v1</span></div>
</div>""")
        elif k == "guide":
            H.append(f"""
<div class="page gd">
  <div class="gd-tag">HOW TO READ</div>
  <h2 class="gd-title">دليل قراءة الأطلس</h2>
  <div class="gd-sub">ثلاث ملاحظات سريعة تضاعف دقة تحليلك البصري للقطات في هذا الملف.</div>
  <div class="gd-card"><div class="gd-h"><span class="gd-n">1</span>بنية الأطلس</div>
    <p class="gd-p">ينقسم الملف إلى جزأين رئيسيين: الجزء الأول يعرض الموقع كما يظهر على سطح المكتب بدقة 1440×900، والجزء الثاني كما يظهر على الجوال بدقة 375×812. يغطي كلا الجزأين المسارات نفسها بالترتيب ذاته: الصفحة الرئيسية، ثم علامات LUT وLa Lounge وYour Birthday، فالمتجر ورحلة الشراء الكاملة، وأخيراً الصفحات العامة والقانونية. الفهرس في الصفحتين التاليتين يحدد رقم صفحة كل مسار في كلا الجزأين.</p></div>
  <div class="gd-card"><div class="gd-h"><span class="gd-n">2</span>طريقة قراءة اللقطات</div>
    <p class="gd-p">كل صفحة طويلة في الموقع قُسّمت إلى مقاطع بارتفاع إطار العرض نفسه، مرتّبة من الأعلى إلى الأسفل، مع تراكب بسيط بين المقطعين المتتاليين يضمن عدم قطع أي عنصر عند الحدود. الرقم أسفل كل إطار (مثل 2/6) يدل على موقع المقطع ضمن مساره. شريط التنقل العلوي وزر واتساب يظهران في كل مقطع لأنها عناصر مثبتة (fixed) تلازم المستخدم أثناء التمرير — وهذا سلوك مقصود وليس تكراراً خاطئاً.</p></div>
  <div class="gd-card"><div class="gd-h"><span class="gd-n">3</span>ملاحظات تقنية عن الالتقاط</div>
    <p class="gd-p">التُقطت اللقطات بعد تمرير كامل لكل صفحة لتفعيل حركات الظهور والصور المتأخرة (lazy)، لذا تعكس الصور الحالة النهائية المكتملة لكل قسم. خلفيات 3D المتحركة (الجزيئات الذهبية لـ LUT والخيوط الماجنتا لـ La Lounge والنجوم الذهبية لـ Birthday) مثبتة خلف المحتوى وتظهر في جميع المقاطع. رحلة الشراء التُقطت بحالة حقيقية بالكامل: سلة فارغة، ثم سلة فيها منتج محدد بتواريخ إيجار، ثم نموذج إتمام الطلب، ثم صفحة الدفع، وأخيراً صفحة نجاح الطلب.</p></div>
</div>""")
        elif k == "toc":
            part = pg["part"]
            vp = VIEWPORTS[part]
            rows = []
            for sec in SECTIONS:
                sp = section_start.get((part, sec["key"]), "—")
                rows.append(f"""<div class="toc-sec"><span class="dot" style="background:{sec['color']}"></span>{sec['title']}<span class="t-line"></span><span class="t-p" style="color:{C['muted']};font-weight:600">{sp}</span></div>""")
                for rkey, rname, rpath in sec["routes"]:
                    p = route_start.get((part, rkey), "—")
                    rows.append(f"""<div class="trow"><span>{rname}</span><span class="t-dots"></span><span class="t-p">{p}</span></div>""")
            H.append(f"""
<div class="page toc">
  <h2 class="toc-title">الفهرس — معاينة {vp['label']}</h2>
  <div class="toc-sub">{vp['spec']} · {fmt(sum(len(routes_inv[r[0]][part]) for s in SECTIONS for r in s['routes']))} لقطة · اضغط رقم الصفحة للانتقال</div>
  <div class="toc-cols">{''.join(rows)}</div>
</div>""")
        elif k == "part":
            part = pg["part"]
            vp = VIEWPORTS[part]
            n = "01" if part == "pc" else "02"
            nseg = total_pc if part == "pc" else total_mo
            H.append(f"""
<div class="page part">
  <div class="pt-ghost">{n}</div>
  <div class="pt-kicker">PART {n}</div>
  <h2 class="pt-title">معاينة {vp['label']}</h2>
  <div class="pt-sub">{('كل صفحات الموقع كما تظهر على شاشة سطح المكتب — من الصفحة الرئيسية إلى صفحة نجاح الطلب.' if part == 'pc' else 'كل صفحات الموقع كما تظهر على شاشة الجوال — بنفس ترتيب الجزء الأول للمقارنة المباشرة بين التجربتين.')}</div>
  <div class="pt-specs">
    <div class="pt-spec"><div class="n">{vp['w']}×{vp['h']}</div><div class="l">أبعاد الالتقاط</div></div>
    <div class="pt-spec"><div class="n">{fmt(n_routes)}</div><div class="l">مسار</div></div>
    <div class="pt-spec"><div class="n">{fmt(nseg)}</div><div class="l">لقطة</div></div>
  </div>
</div>""")
        elif k == "section":
            sec = pg["sec"]
            part = pg["part"]
            idx = [i for i, s in enumerate(SECTIONS, 1) if s["key"] == sec["key"]][0]
            lis = []
            for rkey, rname, rpath in sec["routes"]:
                p = route_start.get((part, rkey), "—")
                lis.append(f"""<li class="sn-li"><span>{rname}</span><span class="s-path">{rpath}</span><span class="s-p">{p}</span></li>""")
            H.append(f"""
<div class="page section">
  <div class="sn-ghost">{idx:02d}</div>
  <div class="sn-bar" style="background:{sec['color']}"></div>
  <div class="sn-en">SECTION {idx:02d} — {sec['en']}</div>
  <h2 class="sn-title">{sec['title']}</h2>
  <ul class="sn-list">{''.join(lis)}</ul>
</div>""")
        elif k == "img":
            part = pg["part"]
            sec = pg["sec"]
            rkey = pg["rkey"]
            r = routes_inv[rkey]
            segs = pg["segs"]
            vp = VIEWPORTS[part]
            first = pg.get("first")
            cls = "f-pc" if part == "pc" else "f-mo"
            figs = []
            for si, seg in enumerate(segs):
                i_global = pg["idx"] + si + 1
                info = inv[part][seg]
                ar = f"{info['w']}/{info['h']}"
                figs.append(f"""<figure class="frame {cls}">
  <img src="{info['file']}" style="aspect-ratio:{ar}" alt="مسار {r['name']} — مقطع {i_global} من {pg['total']}">
  <figcaption><span>مسار {r['name']}</span><span><span class="fg-num">{i_global}</span> / {pg['total']}</span></figcaption>
</figure>""")
            banner = ""
            if first:
                banner = f"""<div class="route-banner">
  <div class="rb-r">{r['name']}</div>
  <div class="rb-l"><span class="rb-count">{fmt(pg['total'])} مقاطع</span><span>{r['path']}</span><span>{vp['spec']}</span></div>
</div>"""
            else:
                banner = f"""<div class="route-banner" style="padding:6px 14px">
  <div class="rb-r" style="font-size:12px;font-weight:700;color:{C['muted']}">{r['name']} — تكملة</div>
  <div class="rb-l"><span style="direction:ltr">{r['path']}</span><span>{vp['spec']}</span></div>
</div>"""
            H.append(f"""
<div class="page">
  <header class="phead">
    <div class="ph-r"><span class="dot" style="background:{sec['color']}"></span><span class="ph-name">{r['name']}</span></div>
    <div class="ph-l"><span class="ph-path">{r['path']}</span><span class="ph-chip">{vp['spec']}</span></div>
  </header>
  <div class="hair"></div>
  {banner}
  <div class="frames">{''.join(figs)}</div>
  <div class="hair"></div>
  <footer class="pfoot"><span>LUT Luxury — أطلس بصري</span><span>معاينة {vp['label']}</span><span class="pnum">{pg['p']}</span></footer>
</div>""")
        elif k == "ending":
            err_note = "لم تُرصد أي أخطاء في وحدة التحكم أثناء التقاط اللقطات." if err_count == 0 else f"رُصدت {fmt(err_count)} رسالة خطأ في وحدة التحكم أثناء الالتقاط (انظر ملف console-errors.log المرفق)."
            H.append(f"""
<div class="page end">
  <div class="end-title">نهاية الأطلس</div>
  <p class="end-sub">يغطي هذا الملف {fmt(n_routes)} مساراً عبر {fmt(total_pc)} لقطة سطح مكتب و{fmt(total_mo)} لقطة جوال، بترتيب مطابق لتجربة المستخدم الحقيقية من أول زيارة حتى إتمام الطلب والدفع. {err_note}</p>
  <div class="end-stats">
    <div class="end-st"><div class="n">{fmt(total_pages)}</div><div class="l">صفحة</div></div>
    <div class="end-st"><div class="n">{fmt(total_pc + total_mo)}</div><div class="l">لقطة</div></div>
    <div class="end-st"><div class="n">{fmt(n_routes)}</div><div class="l">مسار</div></div>
  </div>
  <div class="end-brands">Last Unique Touch · La Lounge · Your Birthday — الكويت · {today}</div>
</div>""")

    H.append("</body>\n</html>\n")

    html = "\n".join(H)
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"HTML: {OUT_HTML}")
    print(f"pages: {total_pages} | pc shots: {total_pc} | mo shots: {total_mo} | routes: {n_routes}")
    if missing:
        print(f"WARNING — routes with no PC shots: {missing}")
    if err_count:
        print(f"console errors detected: {err_count}")
        for s in err_samples:
            print("  •", s)


if __name__ == "__main__":
    build()
