#!/usr/bin/env python3
"""
Convert the 10 blog markdown files into a Sanity-ready NDJSON file.
Each document is prefixed with 'drafts.' to make it a draft in Sanity.
Import with: sanity dataset import sanity-import.ndjson <dataset>
"""
import json
import re
import os
import uuid
from pathlib import Path

INPUT_DIR = Path("/home/claude/skibooker-blogs")
OUTPUT = Path("/home/claude/skibooker-blogs/sanity-import.ndjson")

def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        return {}, text
    raw, body = m.group(1), m.group(2).strip()
    meta = {}
    for line in raw.splitlines():
        if ":" not in line: continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip().strip('"') for x in v[1:-1].split(",") if x.strip()]
        elif v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        elif v == "null":
            v = None
        meta[k] = v
    return meta, body

def md_to_portable_text(body):
    """Convert markdown body to Sanity's Portable Text block array."""
    blocks = []
    lines = body.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue
        # Heading
        if line.startswith("## "):
            blocks.append({
                "_key": uuid.uuid4().hex[:12],
                "_type": "block",
                "style": "h2",
                "markDefs": [],
                "children": [{"_key": uuid.uuid4().hex[:12], "_type": "span", "text": line[3:], "marks": []}],
            })
            i += 1
            continue
        if line.startswith("# "):
            blocks.append({
                "_key": uuid.uuid4().hex[:12],
                "_type": "block",
                "style": "h1",
                "markDefs": [],
                "children": [{"_key": uuid.uuid4().hex[:12], "_type": "span", "text": line[2:], "marks": []}],
            })
            i += 1
            continue
        # Horizontal rule
        if line.strip() == "---":
            i += 1
            continue
        # Bullet list
        if line.startswith("- "):
            while i < len(lines) and lines[i].startswith("- "):
                blocks.append({
                    "_key": uuid.uuid4().hex[:12],
                    "_type": "block",
                    "style": "normal",
                    "listItem": "bullet",
                    "level": 1,
                    "markDefs": [],
                    "children": parse_inline(lines[i][2:].rstrip()),
                })
                i += 1
            continue
        # Paragraph - collect until blank line
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", "- ", "---")):
            para.append(lines[i].rstrip())
            i += 1
        text = " ".join(para)
        # Italic-only line = caption style? Keep normal
        style = "normal"
        blocks.append({
            "_key": uuid.uuid4().hex[:12],
            "_type": "block",
            "style": style,
            "markDefs": [],
            "children": parse_inline(text),
        })
    return blocks

def parse_inline(text):
    """Handle **bold** and *italic* and produce span children."""
    spans = []
    # Simple tokenizer for **bold** and *italic*
    pattern = re.compile(r'(\*\*([^*]+)\*\*|\*([^*]+)\*)')
    pos = 0
    for m in pattern.finditer(text):
        if m.start() > pos:
            spans.append({"_key": uuid.uuid4().hex[:12], "_type": "span", "text": text[pos:m.start()], "marks": []})
        if m.group(2):  # bold
            spans.append({"_key": uuid.uuid4().hex[:12], "_type": "span", "text": m.group(2), "marks": ["strong"]})
        elif m.group(3):  # italic
            spans.append({"_key": uuid.uuid4().hex[:12], "_type": "span", "text": m.group(3), "marks": ["em"]})
        pos = m.end()
    if pos < len(text):
        spans.append({"_key": uuid.uuid4().hex[:12], "_type": "span", "text": text[pos:], "marks": []})
    if not spans:
        spans = [{"_key": uuid.uuid4().hex[:12], "_type": "span", "text": text, "marks": []}]
    return spans

docs = []
for path in sorted(INPUT_DIR.glob("*.md")):
    raw = path.read_text()
    meta, body = parse_frontmatter(raw)
    slug = meta.get("slug", path.stem)
    doc = {
        "_id": f"drafts.post-{slug}",
        "_type": meta.get("_type", "post"),
        "title": meta.get("title", ""),
        "slug": {"_type": "slug", "current": slug},
        "excerpt": meta.get("excerpt", ""),
        "seo": {
            "_type": "seo",
            "title": meta.get("seoTitle", ""),
            "description": meta.get("seoDescription", ""),
        },
        "categories": meta.get("categories", []) if isinstance(meta.get("categories"), list) else [],
        "tags": meta.get("tags", []) if isinstance(meta.get("tags"), list) else [],
        "body": md_to_portable_text(body),
    }
    docs.append(doc)

with open(OUTPUT, "w") as f:
    for d in docs:
        f.write(json.dumps(d) + "\n")

print(f"Wrote {len(docs)} draft documents to {OUTPUT}")
print(f"File size: {OUTPUT.stat().st_size:,} bytes")
