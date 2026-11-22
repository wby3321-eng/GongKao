#!/usr/bin/env bash
# 为每个分组创建知识库根目录，空目录用 .gitkeep 占位
# 用法: bash bootstrap.sh <repo> <分组1> [分组2 ...]
set -euo pipefail

REPO="${1:-.}"
shift || true

if [ "$#" -eq 0 ]; then
  echo "用法: bash bootstrap.sh <repo> <分组1> [分组2 ...]" >&2
  exit 1
fi

cd "$REPO"

for group in "$@"; do
  mkdir -p "$group/知识库"
  touch "$group/知识库/.gitkeep"
done

echo "已创建："
for group in "$@"; do
  echo "  $group/知识库"
done
