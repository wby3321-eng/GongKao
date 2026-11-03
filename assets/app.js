// ===== 单一事实来源 =====
let DATA = null;
let STATE = {
  provinceIdx: 0,
  categoryIdx: 0,
  groupIdx: 0,
  year: '_all',
};

// ===== 初始化 =====
async function init() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    DATA = await res.json();
  } catch (e) {
    document.getElementById('file-grid').innerHTML =
      '<div class="loading" style="color:#f59e0b">❌ data.json 加载失败</div>';
    console.error(e);
    return;
  }

  // 生成时间戳
  if (DATA.generated_at) {
    const d = new Date(DATA.generated_at);
    document.getElementById('gen-time').textContent =
      '更新于 ' + d.toLocaleString('zh-CN');
  }

  render();
  bindEvents();
}

// ===== 渲染入口 =====
function render() {
  renderProvinces();
  renderCategories();
  renderGroups();
  renderYearFilter();
  renderFiles();
}

function renderProvinces() {
  const nav = document.getElementById('province-nav');
  nav.innerHTML = DATA.provinces.map((p, i) =>
    `<button class="nav-chip ${i === STATE.provinceIdx ? 'active' : ''}" data-province="${i}">
      🗺️ ${p.name}
    </button>`
  ).join('');
  nav.querySelectorAll('[data-province]').forEach(el => {
    el.onclick = () => {
      STATE.provinceIdx = +el.dataset.province;
      STATE.categoryIdx = 0;
      STATE.groupIdx = 0;
      STATE.year = '_all';
      render();
    };
  });
}

function renderCategories() {
  const nav = document.getElementById('category-nav');
  const p = DATA.provinces[STATE.provinceIdx];
  nav.innerHTML = p.categories.map((c, i) =>
    `<button class="nav-chip ${i === STATE.categoryIdx ? 'active' : ''}" data-category="${i}">
      📂 ${c.label}
    </button>`
  ).join('');
  nav.querySelectorAll('[data-category]').forEach(el => {
    el.onclick = () => {
      STATE.categoryIdx = +el.dataset.category;
      STATE.groupIdx = 0;
      STATE.year = '_all';
      render();
    };
  });
}

function renderGroups() {
  const nav = document.getElementById('group-nav');
  const p = DATA.provinces[STATE.provinceIdx];
  const c = p.categories[STATE.categoryIdx];
  if (!c || !c.groups || c.groups.length <= 1) { nav.innerHTML = ''; return; }
  nav.innerHTML = c.groups.map((g, i) =>
    `<button class="nav-chip ${i === STATE.groupIdx ? 'active' : ''}" data-group="${i}">
      🏷️ ${g.label}
    </button>`
  ).join('');
  nav.querySelectorAll('[data-group]').forEach(el => {
    el.onclick = () => { STATE.groupIdx = +el.dataset.group; STATE.year = '_all'; render(); };
  });
}

function renderYearFilter() {
  const p = DATA.provinces[STATE.provinceIdx];
  const c = p.categories[STATE.categoryIdx];
  const group = c.groups[STATE.groupIdx];
  if (!group) return;

  const years = [...new Set(group.files.map(f => f.year))].sort().reverse();
  const chips = ['<button class="year-chip ' + (STATE.year === '_all' ? 'active' : '') + '" data-year="_all">全部</button>']
    .concat(years.map(y =>
      `<button class="year-chip ${y === STATE.year ? 'active' : ''}" data-year="${y}">${y}</button>`
    ));
  document.getElementById('year-filter').innerHTML = chips.join('');
  document.querySelectorAll('.year-chip').forEach(el => {
    el.onclick = () => { STATE.year = el.dataset.year; renderFiles(); renderYearFilter(); };
  });
}

function renderFiles() {
  const p = DATA.provinces[STATE.provinceIdx];
  const c = p.categories[STATE.categoryIdx];
  const group = c.groups[STATE.groupIdx];

  let files = group.files.slice();
  if (STATE.year !== '_all') files = files.filter(f => f.year === STATE.year);
  files.sort((a, b) => b.year.localeCompare(a.year));

  const grid = document.getElementById('file-grid');
  grid.innerHTML = files.map(f => {
    const sizeKB = (f.size / 1024).toFixed(1);
    const viewerUrl = `viewer.html?path=${encodeURIComponent(f.path)}&name=${encodeURIComponent(f.name + f.ext)}`;
    return `
      <a class="file-card" href="${viewerUrl}">
        <div class="card-head">
          <span class="year-tag">${f.year}</span>
          <span class="ext-tag">${f.ext.replace('.','')}</span>
        </div>
        <div class="card-title">${escapeHtml(f.name)}</div>
        <div class="card-meta">
          <span>${sizeKB} KB</span>
          <span>点击预览 →</span>
        </div>
      </a>
    `;
  }).join('');

  document.getElementById('total-count').textContent = files.length;
}

// ===== Helpers =====
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function bindEvents() {}

// ===== 启动 =====
init();
