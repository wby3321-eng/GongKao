// 公务员考试资料库 · 重点知识 前端
// 数据由 scripts/gen-data.py 在部署时生成 data.json 与 xmind/*.xmind

const $ = (id) => document.getElementById(id);

let DATA = null;
let currentProv = null;
let currentFile = null; // {name, ext, path, content}
let currentQuery = '';

const MODULE_META = {
  '政治理论': ['#14b8a6', '🏛️'],
  '常识判断': ['#8b5cf6', '📚'],
  '言语理解与表达': ['#3b82f6', '💬'],
  '数量关系': ['#f59e0b', '📐'],
  '判断推理': ['#ef4444', '🧩'],
  '资料分析': ['#10b981', '📊'],
  '科学推理': ['#06b6d4', '🔬'],
  '申论': ['#ec4899', '✍️'],
};
function moduleMeta(name) { return MODULE_META[name] || ['#6b7280', '📁']; }

function provColor(p) {
  return { '国考': '#14b8a6', '广东省': '#3b82f6', '陕西省': '#f59e0b' }[p] || '#6b7280';
}

/* ===== 工具 ===== */
function collectFiles(node, path = []) {
  const res = [];
  const cur = [...path, node.name];
  if (node.type === 'file') res.push({ ...node, path: cur });
  else (node.children || []).forEach((c) => res.push(...collectFiles(c, cur)));
  return res;
}
function countFiles(node) {
  if (node.type === 'file') return 1;
  return (node.children || []).reduce((s, c) => s + countFiles(c), 0);
}
function isKnowledgeLeaf(node) {
  if (node.type !== 'dir') return false;
  if (node.name === '图片resource') return false;
  return !(node.children || []).some((c) => c.type === 'dir');
}
function leafHasMd(node) {
  return (node.children || []).some((c) => c.type === 'file' && /\.md$/i.test(c.ext || c.name));
}

/* ===== 省份切换 ===== */
function renderPills() {
  $('prov-pills').innerHTML = DATA.provinces
    .map((p) => {
      const d = p.progress;
      return `<span class="pill ${p.name === currentProv ? 'active' : ''}" data-p="${p.name}" style="${p.name === currentProv ? '' : 'color:' + provColor(p.name)}">${p.name} · ${d.done}/${d.total}</span>`;
    })
    .join('');
  document.querySelectorAll('.pill').forEach((el) => (el.onclick = () => switchProvince(el.dataset.p)));
  // xmind 下载链接
  const xmindUrl = `xmind/${encodeURIComponent(currentProv)}-重点知识.xmind`;
  $('btn-xmind').href = xmindUrl;
  $('btn-xmind').setAttribute('download', `${currentProv}-重点知识.xmind`);
}
function switchProvince(p) {
  currentProv = p;
  currentFile = null;
  currentQuery = '';
  $('search-input').value = '';
  $('search-count').style.display = 'none';
  renderPills();
  renderTree();
  renderHome();
}

/* ===== 首页：汇总进度 + 模块卡片 ===== */
function renderHome() {
  const prov = DATA.provinces.find((p) => p.name === currentProv);
  const d = prov.progress;
  const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
  const cards = d.modules
    .map((m) => {
      const mp = m.total ? Math.round((m.done / m.total) * 100) : 0;
      const [color, ico] = moduleMeta(m.name);
      return `<div class="card" data-module="${m.name}">
        <div class="head">
          <div class="chip" style="background:${color}22;color:${color}">${ico}</div>
          <div class="name">${m.name}</div>
          <div class="pct" style="color:${color}">${mp}%</div>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${mp}%;background:${color}"></div></div>
        <div class="cnt">已复习 ${m.done} / ${m.total} 个知识点</div>
      </div>`;
    })
    .join('');
  $('content').className = 'content home';
  $('content').innerHTML = `
    <div class="summary">
      <div><div class="big">${pct}%</div><div class="lbl">整体复习进度</div></div>
      <div class="bar">
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="lbl" style="margin-top:6px">已完成 ${d.done} / 总 ${d.total} 个知识点</div>
      </div>
    </div>
    <h2>${currentProv} · 重点知识模块</h2>
    <div class="cards">${cards || '<div class="empty">暂无模块</div>'}</div>`;
  document.querySelectorAll('.card').forEach((c) => (c.onclick = () => openModule(c.dataset.module)));
}

/* ===== 侧栏树（不显示已复习标记，仅显示文件数）===== */
function renderTree() {
  const prov = DATA.provinces.find((p) => p.name === currentProv);
  const ul = document.createElement('ul');
  ul.appendChild(treeNode(prov.root, ['重点知识']));
  $('tree').innerHTML = `
    <div class="group-title">
      <span>${currentProv} / 重点知识</span>
      <span class="tree-tools">
        <button type="button" data-act="expand">展开</button>
        <button type="button" data-act="collapse">收起</button>
      </span>
    </div>`;
  $('tree').appendChild(ul);
  $('tree').querySelector('[data-act="expand"]').onclick = () => setAllOpen(true);
  $('tree').querySelector('[data-act="collapse"]').onclick = () => setAllOpen(false);
}
function setAllOpen(open) {
  $('tree').querySelectorAll('li').forEach((li) => li.classList.toggle('open', open));
  $('tree').querySelectorAll('.caret').forEach((c) => c.classList.toggle('open', open));
}
function treeNode(node, path) {
  const li = document.createElement('li');
  li.dataset.path = path.join('/');
  const row = document.createElement('div');
  row.className = 'row';
  if (node.type === 'dir') {
    const n = countFiles(node);
    row.innerHTML = `<span class="caret">▶</span><span class="ico">📁</span><span class="label">${node.name}</span>${n ? `<span class="meta">${n}</span>` : ''}`;
    // 默认全部展开：子目录直接展示在父目录下方
    li.classList.add('open');
    row.querySelector('.caret').classList.add('open');
    row.onclick = () => {
      li.classList.toggle('open');
      row.querySelector('.caret').classList.toggle('open');
      markActive(path);
      openDir(node, path);
    };
    // 先放父目录行，再放子目录列表，保证子目录在父目录下方
    li.appendChild(row);
    const ul = document.createElement('ul');
    (node.children || []).forEach((c) => ul.appendChild(treeNode(c, [...path, c.name])));
    li.appendChild(ul);
    return li;
  } else {
    row.innerHTML = `<span class="caret leaf">·</span><span class="ico">${/\.md$/i.test(node.name) ? '📝' : '🖼️'}</span><span class="label">${node.name}</span>`;
    row.onclick = (e) => {
      e.stopPropagation();
      markActive(path);
      openFile({ ...node, path });
    };
    li.appendChild(row);
    return li;
  }
}
function markActive(path) {
  const key = path.join('/');
  document.querySelectorAll('#tree .row').forEach((r) => {
    const li = r.parentElement;
    r.classList.toggle('active', li && li.dataset.path === key);
  });
}
// 展开到指定路径（含祖先）
function revealPath(path) {
  const key = path.join('/');
  const li = $('tree').querySelector(`li[data-path="${CSS.escape(key)}"]`);
  if (!li) return;
  let p = li.parentElement;
  while (p && p.tagName === 'LI') {
    p.classList.add('open');
    const c = p.querySelector(':scope > .row .caret');
    if (c) c.classList.add('open');
    p = p.parentElement;
  }
  li.classList.add('open');
  const c = li.querySelector(':scope > .row .caret');
  if (c) c.classList.add('open');
  markActive(path);
  li.scrollIntoView({ block: 'nearest' });
}

/* ===== 模块 / 文件 ===== */
function currentProvObj() {
  return DATA.provinces.find((p) => p.name === currentProv);
}
// 点击目录：右侧展示该目录内容（子目录 + 笔记）
function openDir(node, path) {
  currentFile = null;
  const subs = (node.children || []).filter((c) => c.type === 'dir');
  const mds = (node.children || []).filter((c) => c.type === 'file' && /\.md$/i.test(c.name));
  const leaf = isKnowledgeLeaf(node);
  const stat = leaf
    ? mds.length ? `已归纳 ${mds.length} 篇笔记` : '该知识点暂无笔记'
    : `共 ${countFiles(node)} 篇笔记 · ${subs.length} 个子目录`;
  $('content').className = 'content doc';
  $('content').innerHTML = `
    <div class="crumb">${[currentProv, ...path].map((p) => `<span>${p}</span>`).join(' / ')}</div>
    <div class="markdown-body">
      <h1>📁 ${node.name}</h1>
      <p style="color:var(--muted)">${stat}</p>
      ${subs.length ? `<h2>子目录</h2><ul>${subs.map((c) => `<li><a href="#" data-dir="${[...path, c.name].join('/')}" style="color:var(--accent)">${c.name}</a> <span style="font-size:12px;color:var(--muted)">${countFiles(c)} 篇</span></li>`).join('')}</ul>` : ''}
      ${mds.length ? `<h2>笔记</h2><ul>${mds.map((c) => `<li><a href="#" data-file="${[...path, c.name].join('/')}" style="color:var(--accent)">${c.name.replace(/\.md$/i, '')}</a></li>`).join('')}</ul>` : ''}
    </div>`;
  $('content').querySelectorAll('[data-dir]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const target = findNode(a.dataset.dir);
      if (target) {
        revealPath(target.path);
        openDir(target.node, target.path);
      }
    };
  });
  $('content').querySelectorAll('[data-file]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const f = collectFiles(currentProvObj().root).find((x) => x.path.join('/') === a.dataset.file);
      if (f) {
        revealPath(f.path);
        openFile(f);
      }
    };
  });
}
// 按全路径查找目录节点
function findNode(key) {
  const segs = key.split('/');
  let node = currentProvObj().root;
  const path = ['重点知识'];
  if (segs[0] !== '重点知识') return null;
  for (let i = 1; i < segs.length; i++) {
    node = (node.children || []).find((c) => c.name === segs[i] && c.type === 'dir');
    if (!node) return null;
    path.push(node.name);
  }
  return { node, path };
}

function openModule(name) {
  const root = currentProvObj().root;
  const mod = (root.children || []).find((m) => m.name === name);
  if (!mod) return;
  // 用从根开始的全路径，保证 data-open 与查找一致
  const prefix = ['重点知识', name].join('/');
  const files = collectFiles(root).filter(
    (f) => /\.md$/i.test(f.name) && f.path.slice(0, 2).join('/') === prefix
  );
  const prov = currentProvObj();
  const mstat = prov.progress.modules.find((m) => m.name === name) || { done: 0, total: 0 };
  $('content').className = 'content doc';
  $('content').innerHTML = `
    <div class="crumb">${currentProv} <span>/</span> 重点知识 <span>/</span> ${name}</div>
    <div class="markdown-body">
      <h1>${moduleMeta(name)[1]} ${name}</h1>
      <p style="color:var(--muted)">复习进度：${mstat.done} / ${mstat.total} 个知识点已归纳笔记</p>
      ${files.length ? `<ul>${files.map((f) => `<li><a href="#" data-open="${f.path.join('/')}" style="color:var(--accent)">${f.name.replace(/\.md$/i, '')}</a></li>`).join('')}</ul>` : '<p style="color:var(--muted)">该模块暂未归纳 Markdown 笔记。复习后将 .md 文件放入对应知识点目录即可自动出现。</p>'}
    </div>`;
  document.querySelectorAll('[data-open]').forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const f = collectFiles(currentProvObj().root).find((x) => x.path.join('/') === a.dataset.open);
      if (f) openFile(f);
    };
  });
}

function openFile(file) {
  currentFile = file;
  $('content').className = 'content doc';
  if (/\.md$/i.test(file.name)) {
    const html = resolveImages(highlightSearch(marked.parse(file.content || '')), file.path);
    const gh = `https://github.com/wby3321-eng/GongKao/blob/main/${file.path}`;
    $('content').innerHTML = `
      <div class="crumb">${file.path.slice(0, -1).map((p) => `<span>${p}</span>`).join(' / ')}</div>
      <div class="actions"><a href="${gh}" target="_blank" rel="noopener">在 GitHub 查看原文</a><a href="${file.path}" target="_blank" rel="noopener">下载原文件</a></div>
      <div class="markdown-body">${html}</div>`;
  } else {
    // 图片等其它文件：直接展示/链接
    $('content').innerHTML = `
      <div class="crumb">${file.path.slice(0, -1).map((p) => `<span>${p}</span>`).join(' / ')}</div>
      <div class="markdown-body"><img src="${file.path}" alt="${file.name}"></div>`;
  }
}

// 把 md 中相对图片路径解析为相对于文件所在目录（Pages 根路径）
function resolveImages(html, filePath) {
  const dir = filePath.slice(0, -1).join('/');
  return html.replace(/<img([^>]*?)src="([^"]+)"/g, (m, pre, src) => {
    if (/^(https?:|\/|data:)/i.test(src)) return m;
    return `<img${pre}src="${dir ? dir + '/' : ''}${src}"`;
  });
}

/* ===== 搜索（文件名 + 正文）===== */
$('search-input').addEventListener('input', (e) => {
  currentQuery = e.target.value.trim().toLowerCase();
  const all = collectFiles(currentProvObj().root).filter((f) => /\.md$/i.test(f.name));
  if (!currentQuery) {
    $('search-count').style.display = 'none';
    renderTree();
    currentFile ? openFile(currentFile) : renderHome();
    return;
  }
  const hits = all.filter((f) => f.name.toLowerCase().includes(currentQuery) || (f.content || '').toLowerCase().includes(currentQuery));
  $('search-count').style.display = hits.length ? 'inline-block' : 'none';
  $('search-count').textContent = hits.length;
  renderTreeFiltered(hits);
  renderSearchResults(hits);
});

function renderTreeFiltered(hits) {
  const paths = new Set(hits.map((f) => f.path.join('/')));
  function keep(node, path) {
    const p = [...path, node.name];
    if (node.type === 'file') return paths.has(p.join('/'));
    const kids = (node.children || []).map((c) => keep(c, p)).filter(Boolean);
    return kids.length ? { ...node, children: kids } : null;
  }
  const root = keep(currentProvObj().root, []);
  if (!root) {
    $('tree').innerHTML = '<div class="empty" style="padding:20px">无匹配</div>';
    return;
  }
  const ul = document.createElement('ul');
  ul.appendChild(treeNode(root, ['重点知识']));
  ul.querySelectorAll('li').forEach((li) => li.classList.add('open'));
  ul.querySelectorAll('.caret').forEach((c) => c.classList.add('open'));
  $('tree').innerHTML = '';
  $('tree').appendChild(ul);
}

function renderSearchResults(hits) {
  $('content').className = 'content doc';
  if (!hits.length) {
    $('content').innerHTML = `<div class="empty">没有找到与「${currentQuery}」相关的内容</div>`;
    return;
  }
  const re = new RegExp('(' + currentQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  const items = hits
    .map((f) => {
      const idx = (f.content || '').toLowerCase().indexOf(currentQuery);
      const snip = idx >= 0 ? (idx > 30 ? '…' : '') + f.content.slice(Math.max(0, idx - 30), idx + currentQuery.length + 50).replace(/\n/g, ' ') + '…' : '文件名匹配';
      return `<div class="card" style="display:block;cursor:pointer" data-open="${f.path.join('/')}">
        <div style="display:flex;align-items:center;gap:8px"><span>📝</span><strong style="font-size:14px">${f.name.replace(/\.md$/i, '').replace(re, '<mark>$1</mark>')}</strong></div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${f.path.slice(0, -1).join(' / ')}</div>
        <div style="font-size:12px;color:#64748b;margin-top:6px">${snip.replace(re, '<mark>$1</mark>')}</div>
      </div>`;
    })
    .join('');
  $('content').innerHTML = `<div class="crumb">搜索结果 <span>/</span> 「${currentQuery}」 · 命中 ${hits.length} 篇</div>
    <div style="display:flex;flex-direction:column;gap:10px">${items}</div>`;
  document.querySelectorAll('[data-open]').forEach((el) => {
    el.onclick = () => {
      const f = collectFiles(currentProvObj().root).find((x) => x.path.join('/') === el.dataset.open);
      if (f) openFile(f);
    };
  });
}

function highlightSearch(html) {
  if (!currentQuery) return html;
  const re = new RegExp('(' + currentQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return html.replace(/<[^>]+>/g, (m) => '\x00' + m + '\x01').replace(re, '<mark>$1</mark>').replace(/\x00([\s\S]*?)\x01/g, '$1');
}

/* ===== 脑图视图（中心根节点，向两侧发散）===== */
function renderMindmap() {
  const root = currentProvObj().root;
  const mods = (root.children || []).filter((c) => c.type === 'dir');
  const half = Math.ceil(mods.length / 2);
  const rightMods = mods.slice(0, half);
  const leftMods = mods.slice(half);
  $('content').className = 'content';
  $('content').innerHTML = `
    <div class="mindmap-wrap">
      <div class="mindmap">
        <div class="mm-center">
          <div class="mm-side left">${leftMods.map((m) => mmHtml(m, 1, ['重点知识', m.name], 'left')).join('')}</div>
          <div class="mm-label root">${root.name}</div>
          <div class="mm-side right">${rightMods.map((m) => mmHtml(m, 1, ['重点知识', m.name], 'right')).join('')}</div>
        </div>
      </div>
    </div>`;
  // 最底层知识点：点击跳转到「知识」视图下对应目录
  $('content').querySelectorAll('[data-jump]').forEach((el) => {
    el.onclick = () => {
      const path = el.dataset.jump.split('/');
      const target = findNode(el.dataset.jump);
      switchView('knowledge');
      revealPath(path);
      if (target) openDir(target.node, target.path);
    };
  });
}
function mmHtml(node, depth, path, dir) {
  const leaf = isKnowledgeLeaf(node);
  let cls = 'mm-label';
  if (depth === 1) cls += ' lv1';
  if (leaf) cls += leafHasMd(node) ? ' done' : ' pending';
  let style = '';
  if (depth === 1) {
    const [color] = moduleMeta(node.name);
    style = ` style="border-color:${color};color:${color}"`;
  }
  const jump = leaf ? ` data-jump="${path.join('/')}"` : '';
  const label = `<div class="${cls}"${style}${jump}>${node.name.replace(/\.md$/i, '')}</div>`;
  const kids = (node.children || []).filter((c) => c.type === 'dir');
  const children = kids.length
    ? `<div class="mmn-children">${kids.map((c) => mmHtml(c, depth + 1, [...path, c.name], dir)).join('')}</div>`
    : '';
  return `<div class="mmn ${dir}">${label}${children}</div>`;
}

function switchView(v) {
  $('btn-knowledge').classList.toggle('active', v === 'knowledge');
  $('btn-mindmap').classList.toggle('active', v === 'mindmap');
  $('sidebar').style.display = v === 'mindmap' ? 'none' : 'block';
  if (v === 'mindmap') renderMindmap();
  else currentFile ? openFile(currentFile) : renderHome();
}
$('btn-knowledge').onclick = () => switchView('knowledge');
$('btn-mindmap').onclick = () => switchView('mindmap');

/* ===== 初始化 ===== */
async function init() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    DATA = await res.json();
  } catch (e) {
    $('content').innerHTML = '<div class="empty" style="color:#f59e0b">❌ data.json 加载失败，请确认已运行 scripts/gen-data.py</div>';
    return;
  }
  if (!DATA.provinces || !DATA.provinces.length) {
    $('content').innerHTML = '<div class="empty">暂无「重点知识」数据</div>';
    return;
  }
  currentProv = DATA.provinces[0].name;
  renderPills();
  renderTree();
  renderHome();
}
init();
