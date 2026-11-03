// ===== 树状目录渲染 =====

async function init() {
  let data;
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    data = await res.json();
  } catch (e) {
    document.getElementById('tree').innerHTML =
      '<div class="loading" style="color:#f59e0b">❌ data.json 加载失败</div>';
    return;
  }

  // 生成时间
  if (data.generated_at) {
    const d = new Date(data.generated_at);
    document.getElementById('gen-time').textContent = '更新于 ' + d.toLocaleString('zh-CN');
  }

  // 统计文件数
  const total = countFiles(data.provinces);
  document.getElementById('total-count').textContent = total;

  // 渲染树
  const tree = document.getElementById('tree');
  tree.innerHTML = '';
  const ul = document.createElement('ul');
  data.provinces.forEach(p => {
    ul.appendChild(renderProvince(p));
  });
  tree.appendChild(ul);
}

function countFiles(nodes) {
  let c = 0;
  for (const n of nodes) {
    if (n.type === 'file') c++;
    else c += countFiles(n.children);
  }
  return c;
}

function renderProvince(p) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'node-row dir expanded';
  row.innerHTML = `
    <span class="toggle expanded">▶</span>
    <span class="icon">🗺️</span>
    <span class="node-label">${escapeHtml(p.name)}</span>
    <span class="file-meta">${countFiles(p.children)} 份</span>
  `;
  row.addEventListener('click', () => toggleDir(li));
  li.appendChild(row);

  const ul = document.createElement('ul');
  p.children.forEach(n => ul.appendChild(renderNode(n)));
  li.appendChild(ul);
  return li;
}

function renderNode(node) {
  const li = document.createElement('li');

  if (node.type === 'dir') {
    const row = document.createElement('div');
    row.className = 'node-row dir collapsed'; // 默认折叠
    row.innerHTML = `
      <span class="toggle">▶</span>
      <span class="icon">📁</span>
      <span class="node-label">${escapeHtml(node.name)}</span>
      <span class="file-meta">${countFiles(node.children)}</span>
    `;
    row.addEventListener('click', () => toggleDir(li));
    li.appendChild(row);

    const ul = document.createElement('ul');
    node.children.forEach(c => ul.appendChild(renderNode(c)));
    li.appendChild(ul);
  } else {
    // file
    const row = document.createElement('div');
    row.className = 'node-row file';
    const sizeKB = (node.size / 1024).toFixed(0);
    row.innerHTML = `
      <span class="toggle leaf">▶</span>
      <span class="icon">📄</span>
      <span class="node-label">${escapeHtml(node.name)}</span>
      <span class="ext-badge">${node.ext.replace('.', '')}</span>
      <span class="file-meta">${node.year} · ${sizeKB}KB</span>
    `;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(encodeURI(node.path), '_blank', 'noopener');
    });
    li.appendChild(row);
  }

  return li;
}

function toggleDir(li) {
  const row = li.querySelector(':scope > .node-row');
  const toggle = row.querySelector('.toggle');
  if (li.classList.contains('collapsed')) {
    li.classList.remove('collapsed');
    li.classList.add('expanded');
    toggle.classList.add('expanded');
  } else {
    li.classList.add('collapsed');
    li.classList.remove('expanded');
    toggle.classList.remove('expanded');
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

init();
