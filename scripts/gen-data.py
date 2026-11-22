#!/usr/bin/env python3
"""
扫描各省「重点知识」目录，生成 data.json 与各省 .xmind。

- 只收录 {省份}/重点知识 下的内容（真题/答案仅存仓库，不上网页）
- 目录无限递归，不预设层级
- .md 文件读取正文，供前端全文搜索；图片文件记录路径供 md 引用
- 复习进度：最底层知识点目录（不含子目录，排除「图片resource」）下存在 .md 即算已复习
- 生成 {省份}-重点知识.xmind（可用 XMind 软件打开），已复习/未复习用任务标记区分

data.json 与 xmind/ 均为部署时生成的产物，不提交回仓库（见 .gitignore）。
"""

import json
import re
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOCUS = "重点知识"
SKIP_DIRS = {".git", ".github", "scripts", "assets", "xmind"}
RESOURCE_DIR = "图片resource"
MD_EXTS = {".md", ".markdown"}
IMG_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def is_hidden(name: str) -> bool:
    return name.startswith(".")


def scan_dir(dir_path: Path, base: Path) -> list:
    """递归扫描目录，返回子节点列表（目录在前，文件在后；均按名称排序）。"""
    nodes = []

    subdirs = sorted(
        [d for d in dir_path.iterdir() if d.is_dir() and not is_hidden(d.name)],
        key=lambda p: p.name,
    )
    files = sorted(
        [f for f in dir_path.iterdir() if f.is_file() and not is_hidden(f.name)],
        key=lambda p: p.name,
    )

    for sd in subdirs:
        children = scan_dir(sd, base)
        # 空目录（仅含隐藏文件）也保留为节点，用于进度统计与脑图展示
        nodes.append({"type": "dir", "name": sd.name, "children": children})

    for f in files:
        ext = f.suffix.lower()
        rel = f.relative_to(base).as_posix()
        node = {
            "type": "file",
            "name": f.name,
            "ext": ext,
            "path": rel,
            "size": f.stat().st_size,
        }
        if ext in MD_EXTS:
            try:
                node["content"] = f.read_text(encoding="utf-8", errors="replace")
            except Exception:
                node["content"] = ""
        nodes.append(node)

    return nodes


# ===== 复习进度统计 =====
def is_knowledge_leaf(node: dict) -> bool:
    """知识点叶子：是目录、不含任何子目录、且不是资源目录。"""
    if node.get("type") != "dir":
        return False
    if node["name"] == RESOURCE_DIR:
        return False
    return not any(c.get("type") == "dir" for c in node.get("children", []))


def walk_leaves(node: dict, acc: list) -> None:
    if is_knowledge_leaf(node):
        acc.append(node)
        return
    for c in node.get("children", []):
        walk_leaves(c, acc)


def leaf_has_md(node: dict) -> bool:
    return any(
        c.get("type") == "file" and c.get("ext") in MD_EXTS
        for c in node.get("children", [])
    )


def progress_of(node: dict) -> dict:
    leaves = []
    walk_leaves(node, leaves)
    total = len(leaves)
    done = sum(1 for l in leaves if leaf_has_md(l))
    return {"total": total, "done": done}


def module_progress(root: dict) -> list:
    """返回一级模块的进度列表。"""
    out = []
    for m in root.get("children", []):
        if m.get("type") == "dir":
            p = progress_of(m)
            out.append({"name": m["name"], "total": p["total"], "done": p["done"]})
    return out


# ===== 生成 xmind =====
def to_topic(node: dict) -> dict:
    leaf = is_knowledge_leaf(node)
    done = leaf and leaf_has_md(node)
    topic = {"id": new_id(), "title": node["name"]}
    if leaf:
        topic["markers"] = [{"markerId": "task-done" if done else "task-todo"}]
    children = [c for c in node.get("children", []) if c.get("type") == "dir"]
    if children:
        topic["children"] = {"attached": [to_topic(c) for c in children]}
    return topic


def build_xmind(province: str, root: dict) -> bytes:
    sheet = {
        "id": new_id(),
        "class": "sheet",
        "title": f"{province}-{FOCUS}",
        "rootTopic": {
            "id": new_id(),
            "title": f"{province} · {FOCUS}",
            "structureClass": "org.xmind.ui.logic.right",
            "children": {"attached": [to_topic(c) for c in root.get("children", [])]},
        },
    }
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="json" ContentType="application/json"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '</Types>'
    )
    manifest = (
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
        '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">'
        '<manifest:file-entry manifest:media-type="application/json" manifest:full-path="content.json"/>'
        '<manifest:file-entry manifest:media-type="application/json" manifest:full-path="metadata.json"/>'
        "</manifest:manifest>"
    )
    metadata = json.dumps(
        {"creator": {"name": "GongKao"}, "version": "1.0.0"},
        ensure_ascii=False,
    )

    import io
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("META-INF/manifest.xml", manifest)
        z.writestr("metadata.json", metadata)
        z.writestr("content.json", json.dumps([sheet], ensure_ascii=False))
    return buf.getvalue()


# ===== 主流程 =====
def build() -> dict:
    provinces = []
    for province_dir in sorted(ROOT.iterdir()):
        if not province_dir.is_dir() or is_hidden(province_dir.name):
            continue
        if province_dir.name in SKIP_DIRS:
            continue
        focus_dir = province_dir / FOCUS
        if not focus_dir.is_dir():
            continue
        children = scan_dir(focus_dir, ROOT)
        root = {"type": "dir", "name": FOCUS, "children": children}
        p = progress_of(root)
        provinces.append({
            "name": province_dir.name,
            "root": root,
            "progress": {**p, "modules": module_progress(root)},
        })
        # 生成该省 xmind
        xmind_dir = ROOT / "xmind"
        xmind_dir.mkdir(exist_ok=True)
        (xmind_dir / f"{province_dir.name}-{FOCUS}.xmind").write_bytes(build_xmind(province_dir.name, root))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provinces": provinces,
    }


def main():
    data = build()
    out = ROOT / "data.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(p["progress"]["total"] for p in data["provinces"])
    done = sum(p["progress"]["done"] for p in data["provinces"])
    print(f"✅ data.json  省份:{len(data['provinces'])}  知识点:{done}/{total}")
    for p in data["provinces"]:
        print(f"   {p['name']}: {p['progress']['done']}/{p['progress']['total']}  → xmind/{p['name']}-{FOCUS}.xmind")


if __name__ == "__main__":
    main()
