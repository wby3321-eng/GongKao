---
name: tree-knowledge-site
description: 把任意树状目录搭建成知识复习站点，含目录树、进度统计、全文搜索、脑图和 xmind 导出。用户提到树状知识库、复习站点、知识点进度、脑图或导出 xmind 时使用。
---

# 树状知识库站点

把任意层级目录变成可浏览的复习站点：部署时扫描目录生成 `data.json`，页面提供分组切换、模块进度、目录树、全文搜索、脑图与 XMind 导出。适用于考试科目、课程、文档、产品知识、代码规范等任何树状结构。

## 结构约定

```text
<repo>/
├── index.html
├── assets/
│   ├── style.css
│   └── app.js
├── scripts/gen-data.py
├── .github/workflows/deploy-pages.yml
├── .gitignore
└── <分组>/<知识库根>/<模块>/<知识点>/笔记.md
```

- 顶层目录是「分组」，站点顶部的切换标签。
- 默认每个分组下用 `知识库/` 作为扫描根，页面不显示这个根目录名。
- 根目录下可无限嵌套知识点；`DATA` 构建、进度与脑图都按实际目录生成。
- 分组下不属于知识库的目录不会被扫描，可以安心放原始资料。

## 首次搭建

用户给了本地路径就直接用；只给远程地址就先 `git clone`。把 `<skill>` 换成当前 skill 的绝对路径。

1. 复制站点骨架：

   ```bash
   cp -R <skill>/assets/site/. <repo>/
   ```

2. 建分组（生成 `<分组>/知识库/`）：

   ```bash
   bash <skill>/assets/bootstrap.sh <repo> 分组A 分组B
   ```

   若仓库已有现成的树，跳过这一步，改走下面的「接入已有树」。

3. 本地验证：

   ```bash
   cd <repo>
   python3 scripts/gen-data.py
   python3 -m http.server 8080
   ```

   打开 http://localhost:8080，应看到分组标签、模块卡片（0/0）、左侧目录树，脑图可拖动。

4. 提交推送：

   ```bash
   git add -A && git commit -m "初始化知识库站点" && git push
   ```

5. 打开 `https://github.com/<user>/<repo>/settings/pages`，Source 选 **GitHub Actions**，保存。

6. Actions 跑完后访问 `https://<user>.github.io/<repo>/`，对照下方清单自检。

`data.json` 与 `xmind/` 已在 `.gitignore` 中，不要提交这两个部署产物。

## 接入已有树

默认只扫描 `<分组>/知识库`。要让站点直接读取现有目录：

- 把 `scripts/gen-data.py` 的 `SCOPE_SUBDIR` 设为 `""`，每个顶层目录成为一个分组，整棵子树都会被扫描。
- 用 `EXCLUDE_DIRS` 排除不该上页面的目录，例如 `{"真题", "答案", "归档"}`；`node_modules`、`dist`、`build` 等已在 `SKIP_DIRS` 中默认跳过。
- 若所有分组下都有同名子目录（如 `docs`），把 `SCOPE_SUBDIR` 设为该名字即可只展示这一层。
- 分组缺少该子目录时会被跳过，不会报错。

## 可调配置

| 文件 | 配置 | 作用 |
| --- | --- | --- |
| `scripts/gen-data.py` | `SCOPE_SUBDIR` | 扫描根目录名；`""` 表示直接扫描分组 |
| `scripts/gen-data.py` | `XMIND_SUFFIX` | 导出文件名后缀，默认 `知识图谱` |
| `scripts/gen-data.py` | `RESOURCE_DIR` | 图片资源目录名，不计入知识点 |
| `scripts/gen-data.py` | `EXCLUDE_DIRS` | 扫描时整体跳过的目录名 |
| `scripts/gen-data.py` | `ORDER_MAP` | 目录排序表，键为父目录名，`__root__` 为分组下第一层 |
| `assets/app.js` | `EMOJI` | 为模块配图标；未命中的自动用调色板颜色加 📁 |
| `assets/app.js` | `PALETTE` | 模块与分组标签的配色池 |
| `index.html` | 标题与 logo | 站点名称、左上角图标与副标题 |

模块颜色和分组颜色按名称散列自动分配，不需要手工维护。

## 日常操作

### 新增笔记

把 `.md` 放进对应知识点目录，提交推送：

```bash
cp 我的笔记.md "分组A/知识库/模块/知识点/"
git add -A && git commit -m "归纳：知识点" && git push
```

推送后 Actions 自动重新生成数据并部署，该知识点计入「已复习」。

### 新增知识点目录

```bash
mkdir -p "分组A/知识库/模块/新知识点"
touch "分组A/知识库/模块/新知识点/.gitkeep"
git add -A && git commit -m "新增知识点" && git push
```

### 新增分组或模块

直接建目录，不需要改前端代码。想固定排序就把名称补进 `ORDER_MAP`，想定制图标就加到 `EMOJI`。

## 进度口径

- 叶子知识点 = 目录下没有任何子目录，且目录名不是 `RESOURCE_DIR`。
- 叶子里存在 `.md` 即视为已复习；进度 = 已完成叶子数 / 总叶子数。
- 目录树不显示已复习标记，进度只出现在顶部汇总条和模块卡片。
- 图片、PDF、视频等非 `.md` 文件不计入进度。

## 常见坑

- 空目录必须放 `.gitkeep`，否则 git 不保留，页面上也不会出现该节点。
- 以 `.` 开头的文件或目录在扫描时被忽略。
- Markdown 引用图片用相对路径，图片放同目录或 `RESOURCE_DIR` 目录。
- 线上「在 GitHub 查看原文」链接由 `.github.io` 域名自动推导，本地预览时不显示。
- 不要提交 `data.json` 或 `xmind/`，会与每次部署生成的文件冲突。
- 只改样式不需要重新生成 `data.json`；目录或笔记变化才需要。

## 完成自检

1. `python3 scripts/gen-data.py` 输出分组数与知识点数，无异常。
2. 页面分组标签可切换，模块卡片进度正确。
3. 目录树可展开/收起，点击目录右侧显示子目录与笔记。
4. 点击 `.md` 原地渲染正文，搜索能命中文件名和正文。
5. 脑图可拖动，点击最底层节点能跳回目录。
6. 「导出 xmind」按钮能下载并能用 XMind 打开。
