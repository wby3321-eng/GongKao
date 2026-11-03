#!/usr/bin/env python3
"""
扫描试卷目录结构，生成 data.json 供前端使用。

目录约定：
  {省份}/{分类}/.../*文件    (递归扫描)

文件元信息：年份从文件名中自动解析（首位 4 位数字）。

用法：
  python3 scripts/gen-data.py
  python3 scripts/gen-data.py -o custom.json
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


def extract_year(filename: str) -> str:
    m = YEAR_RE.search(filename)
    return m.group(0) if m else "未知"


def sanitize_key(name: str) -> str:
    return name.strip().replace(" ", "_")


def collect_files(dir_path: Path) -> list:
    files = []
    for f in sorted(dir_path.rglob("*")):
        if not f.is_file():
            continue
        if f.suffix.lower() not in SUPPORTED_EXTS:
            continue
        if f.name.startswith("."):
            continue
        rel = str(f.relative_to(ROOT))
        files.append({
            "name": f.stem,
            "ext": f.suffix.lower(),
            "path": rel,
            "year": extract_year(f.name),
            "size": f.stat().st_size,
        })
    return files


def build() -> dict:
    provinces = []

    for province_dir in sorted(ROOT.iterdir()):
        if not province_dir.is_dir():
            continue
        if province_dir.name.startswith("."):
            continue
        if province_dir.name in SKIP_DIRS:
            continue

        categories = []

        for cat_dir in sorted(province_dir.iterdir()):
            if not cat_dir.is_dir():
                continue
            if cat_dir.name.startswith("."):
                continue

            subdirs = sorted([
                d for d in cat_dir.iterdir()
                if d.is_dir() and not d.name.startswith(".")
            ])
            flat_files = [
                f for f in cat_dir.iterdir()
                if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
            ]

            groups = []

            if subdirs:
                for sub in subdirs:
                    fs = collect_files(sub)
                    if fs:
                        groups.append({
                            "key": sanitize_key(sub.name),
                            "label": sub.name,
                            "files": fs,
                        })

            if flat_files and not subdirs:
                groups.append({
                    "key": "_all",
                    "label": "全部",
                    "files": collect_files(cat_dir),
                })
            elif flat_files and subdirs:
                root_group = []
                for f in flat_files:
                    rel = str(f.relative_to(ROOT))
                    root_group.append({
                        "name": f.stem,
                        "ext": f.suffix.lower(),
                        "path": rel,
                        "year": extract_year(f.name),
                        "size": f.stat().st_size,
                    })
                if root_group:
                    groups.append({
                        "key": "_root",
                        "label": "其他",
                        "files": root_group,
                    })

            if groups:
                categories.append({
                    "key": sanitize_key(cat_dir.name),
                    "label": cat_dir.name,
                    "groups": groups,
                })

        if categories:
            provinces.append({
                "name": province_dir.name,
                "categories": categories,
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

    total = sum(
        len(g["files"])
        for p in data["provinces"]
        for c in p["categories"]
        for g in c["groups"]
    )
    print(f"✅ 生成 {args.output}")
    print(f"   省份: {len(data['provinces'])}")
    print(f"   分类: {sum(len(p['categories']) for p in data['provinces'])}")
    print(f"   文件: {total}")


if __name__ == "__main__":
    main()
