#!/usr/bin/env python3
"""
递归扫描目录，生成树形 data.json。

结构：
  provinces[].children[] = directory | file
  directory: { type:"dir", name, children:[] }
  file:      { type:"file", name, ext, path, year, size }

用法：python3 scripts/gen-data.py
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".github", "scripts", "assets"}
SUPPORTED_EXTS = {".pdf", ".docx", ".doc"}
YEAR_RE = re.compile(r"(19|20)\d{2}")


def extract_year(fn: str) -> str:
    m = YEAR_RE.search(fn)
    return m.group(0) if m else "未知"


def scan_dir(dir_path: Path, base: Path) -> list:
    """递归扫描，返回该目录下的子节点列表"""
    nodes = []

    # 先收集并排序：目录在前，文件在后
    subdirs = sorted([
        d for d in dir_path.iterdir()
        if d.is_dir() and not d.name.startswith(".")
        and d.name not in SKIP_DIRS
        and any(
            True for f in d.rglob("*")
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
        )
    ])
    files = sorted([
        f for f in dir_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
        and not f.name.startswith(".")
    ])

    # 子目录节点
    for sd in subdirs:
        nodes.append({
            "type": "dir",
            "name": sd.name,
            "children": scan_dir(sd, base),
        })

    # 文件节点
    for f in files:
        rel = str(f.relative_to(base))
        nodes.append({
            "type": "file",
            "name": f.stem,
            "ext": f.suffix.lower(),
            "path": rel,
            "year": extract_year(f.name),
            "size": f.stat().st_size,
        })

    return nodes


def build() -> dict:
    provinces = []

    for province_dir in sorted(ROOT.iterdir()):
        if not province_dir.is_dir():
            continue
        if province_dir.name.startswith("."):
            continue
        if province_dir.name in SKIP_DIRS:
            continue

        children = scan_dir(province_dir, ROOT)
        if children:
            provinces.append({
                "name": province_dir.name,
                "children": children,
            })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provinces": provinces,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-o", "--output", default=str(ROOT / "data.json"))
    args = parser.parse_args()

    data = build()
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    total = sum(count_files(p["children"]) for p in data["provinces"])
    print(f"✅ {args.output}")
    print(f"   省份: {len(data['provinces'])}  文件: {total}")


def count_files(nodes):
    c = 0
    for n in nodes:
        if n["type"] == "file":
            c += 1
        else:
            c += count_files(n["children"])
    return c


if __name__ == "__main__":
    main()
