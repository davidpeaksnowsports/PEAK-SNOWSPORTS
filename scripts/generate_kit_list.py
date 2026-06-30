#!/usr/bin/env python3
"""Generate the GAP-course lead-magnet kit list PDF.

Branded one-pager ("What to pack for your ski instructor course"), output to
public/downloads/peak-ski-instructor-kit-list.pdf. Content is drawn from the
on-page FAQ packing answer + what's-included list so it stays consistent with
/gap-course. Re-run after editing the lists below.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import os

NAVY = HexColor("#1A2647")
PINK = HexColor("#EB437F")
CREAM = HexColor("#F1ECE0")
WHITE = HexColor("#FFFFFF")

W, H = A4
MARGIN = 42
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "downloads",
                   "peak-ski-instructor-kit-list.pdf")

LEFT = [
    ("ON-SNOW HARDWARE", [
        "Skis, boots & poles (or arrange hire with our partners)",
        "Helmet — mandatory",
        "Goggles (+ a spare low-light lens)",
        "Ski backpack (~15L)",
    ]),
    ("CLOTHING & LAYERS", [
        "Waterproof ski jacket (Gore-Tex or similar)",
        "Waterproof ski pants / salopettes",
        "Merino base layers — several tops & bottoms",
        "Mid-layers / fleece",
        "2 pairs ski gloves",
        "2 beanies",
        "5 pairs ski socks",
        "Neck gaiter / buff",
        "Warm casual clothes for evenings",
    ]),
]

RIGHT = [
    ("BODY & SAFETY", [
        "High-SPF sun cream + lip balm",
        "Sunglasses",
        "Small blister / first-aid kit",
        "Water bottle or flask",
    ]),
    ("ADMIN & DOCUMENTS", [
        "Passport / ID",
        "Travel + winter-sports insurance",
        "   (medical, evacuation, off-piste)",
        "GHIC / EHIC card (if eligible)",
        "Bank card — lift pass & personal spend",
        "Any personal medication",
    ]),
    ("PEAK PROVIDES — LEAVE AT HOME", [
        "Team down jacket / puffer",
        "Course merch",
        "One-way Geneva airport transfer",
    ]),
]


def draw_column(c, x, top, sections, provided_titles):
    y = top
    for title, items in sections:
        c.setFillColor(PINK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, title)
        y -= 19
        provided = title in provided_titles
        for item in items:
            indent = item.startswith("   ")
            label = item.strip()
            if not indent:
                # checkbox (or a filled pink tick-box for "provided" items)
                if provided:
                    c.setFillColor(PINK)
                    c.rect(x, y - 1.5, 9, 9, stroke=0, fill=1)
                else:
                    c.setStrokeColor(NAVY)
                    c.setLineWidth(1)
                    c.rect(x, y - 1.5, 9, 9, stroke=1, fill=0)
            c.setFillColor(NAVY)
            c.setFont("Helvetica", 10)
            c.drawString(x + (16 if not indent else 16), y, label)
            y -= 16
        y -= 8
    return y


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Peak Snowsports — Ski Instructor Course Kit List")

    # Header band
    band_h = 104
    c.setFillColor(NAVY)
    c.rect(0, H - band_h, W, band_h, stroke=0, fill=1)
    c.setFillColor(PINK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN, H - 40, "PEAK SNOWSPORTS  ·  GAP COURSE")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(MARGIN, H - 70, "Ski Instructor Course — Kit List")
    c.setFillColor(CREAM)
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN, H - 90,
                 "Avoriaz can hit –20°C. Pack warm, waterproof and layerable.")

    top = H - band_h - 34
    end_left = draw_column(c, MARGIN, top, LEFT, set())
    end_right = draw_column(c, W / 2 + 12, top, RIGHT,
                            {"PEAK PROVIDES — LEAVE AT HOME"})

    # Footer
    foot_y = min(end_left, end_right) - 6
    foot_y = max(foot_y, 60)
    c.setStrokeColor(PINK)
    c.setLineWidth(2)
    c.line(MARGIN, foot_y, W - MARGIN, foot_y)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(MARGIN, foot_y - 18,
                 "You'll get a full personalised checklist on enrolment. Questions on kit, hire or hand-luggage?")
    c.setFillColor(PINK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, foot_y - 32, "peaksnowsports.com/gap-course")

    c.showPage()
    c.save()
    print("wrote", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
