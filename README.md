# 公务员考试资料库

## 🔗 访问地址

**https://wby3321-eng.github.io/GongKao/**


## 🚀 工作流（全自动）

```
本地新增/修改文件
      ↓
git commit + git push
      ↓
GitHub Actions 自动触发
      ├─ 运行 scripts/gen-data.py
      │     ├─ 扫描各省「重点知识」→ 生成 data.json（含 md 正文，供搜索）
      │     └─ 按目录生成 xmind/{省份}-重点知识.xmind
      └─ 部署到 GitHub Pages
      ↓
https://wby3321-eng.github.io/GongKao/
```

> `data.json` 与 `xmind/` 均为部署时生成，**不提交回仓库**（见 `.gitignore`），避免推送冲突。

### 新增笔记（日常高频操作）

只需两步：

```bash
# 1. 把 .md 笔记放到对应知识点目录
cp 我的笔记.md 广东省/重点知识/判断推理/图形推理/位置规律/

# 2. 提交推送 —— 完事
git add -A
git commit -m "归纳：位置规律"
git push
```

等待约 30 秒，网站自动更新：该知识点变为「已复习」，进度条前进，搜索可命中正文。

### 新增知识点目录

```bash
mkdir -p 广东省/重点知识/数量关系/数学运算/新题型
touch 广东省/重点知识/数量关系/数学运算/新题型/.gitkeep   # 空目录需占位才会被 git 保留
git add -A && git commit -m "新增知识点：新题型" && git push
```

---

## 🧪 本地调试

```bash
python3 scripts/gen-data.py          # 生成 data.json 与 xmind/
python3 -m http.server 8080          # 启动本地服务
open http://localhost:8080
```

### Pages 设置（一次性）

1. 打开 https://github.com/wby3321-eng/GongKao/settings/pages
2. Source 选择 **GitHub Actions**
3. 保存即可（后续全自动）
