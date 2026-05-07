const state = { digest: null, papers: [], query: '', source: '', priority: '' };
const $ = (id) => document.getElementById(id);

function text(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}
function normalizePaper(p) {
  const highlights = Array.isArray(p.highlights) ? p.highlights : [];
  const explicitPriority = ['company', 'high', 'normal'].includes(p.priority) ? p.priority : '';
  const priority = explicitPriority || (highlights.some(h => /Intel|TSMC/i.test(h)) ? 'company' : (Number(p.priority || p.score || 0) >= 2 || Number(p.score || 0) >= 8 ? 'high' : 'normal'));
  return { ...p, highlights, priority };
}
function priorityLabel(priority) {
  if (priority === 'company') return 'Intel / TSMC';
  if (priority === 'high') return '高相关';
  return '普通相关';
}
function searchable(p) {
  return [p.title, p.authors, p.source, p.summary, p.abstract_cn, p.reading_notes, ...(p.highlights || [])]
    .flat().join(' ').toLowerCase();
}
function renderSummary(digest) {
  $('subtitle').textContent = digest.message ? digest.message.split('\n').slice(0, 3).join('｜') : '微电子材料 / 晶体管方向每日论文筛选';
  $('selectedCount').textContent = text(digest.selected_count ?? digest.papers?.length ?? 0, '0');
  $('newCount').textContent = text(digest.new_count, '0');
  $('companyCount').textContent = String(state.papers.filter(p => p.priority === 'company' || (p.highlights || []).some(h => /Intel|TSMC/i.test(h))).length);
  $('generatedAt').textContent = fmtDate(digest.generated_at);
}
function renderSources() {
  const select = $('sourceFilter');
  const sources = [...new Set(state.papers.map(p => p.source).filter(Boolean))].sort();
  for (const source of sources) {
    const opt = document.createElement('option');
    opt.value = source;
    opt.textContent = source;
    select.appendChild(opt);
  }
}
function filteredPapers() {
  const q = state.query.trim().toLowerCase();
  return state.papers.filter(p => {
    if (state.source && p.source !== state.source) return false;
    if (state.priority && p.priority !== state.priority) return false;
    if (q && !searchable(p).includes(q)) return false;
    return true;
  });
}
function renderPapers() {
  const list = $('paperList');
  const table = $('paperTable');
  const tbody = $('paperTableBody');
  const tableEmpty = $('paperTableEmpty');
  list.innerHTML = '';
  tbody.innerHTML = '';
  const papers = filteredPapers();
  if (!papers.length) {
    list.innerHTML = '<div class="empty">没有匹配的论文。</div>';
    table.hidden = true;
    tableEmpty.hidden = false;
    return;
  }
  table.hidden = false;
  tableEmpty.hidden = true;
  const tpl = $('paperCardTemplate');
  papers.forEach((p, i) => {
    const node = tpl.content.cloneNode(true);
    node.querySelector('.meta').textContent = `#${i + 1} · ${text(p.source)} · ${text(p.published)}`;
    const a = node.querySelector('.title');
    a.textContent = text(p.title);
    a.href = p.url || '#';
    node.querySelector('.authors').textContent = Array.isArray(p.authors) ? p.authors.join(', ') : text(p.authors);
    const badge = node.querySelector('.badge');
    badge.textContent = priorityLabel(p.priority);
    badge.classList.add(p.priority);
    const chips = node.querySelector('.chips');
    (p.highlights || []).forEach(h => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = h;
      chips.appendChild(chip);
    });
    if (!chips.children.length) chips.remove();
    node.querySelector('.summary').textContent = text(p.summary, '暂无英文摘要');
    node.querySelector('.abstract-cn').textContent = text(p.abstract_cn || p.overview_cn, '暂无中文概述');
    node.querySelector('.reading-notes').textContent = text(p.reading_notes || p.keyword_extract, '暂无阅读导览');
    list.appendChild(node);

    const tr = document.createElement('tr');
    appendCell(tr, `#${i + 1}`, 'index-cell');
    const badgeCell = document.createElement('td');
    const tableBadge = document.createElement('span');
    tableBadge.className = `badge ${p.priority}`;
    tableBadge.textContent = priorityLabel(p.priority);
    badgeCell.appendChild(tableBadge);
    tr.appendChild(badgeCell);
    appendCell(tr, text(p.source));
    appendCell(tr, text(p.published));
    const titleCell = document.createElement('td');
    titleCell.className = 'title-cell';
    const link = document.createElement('a');
    link.href = p.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = text(p.title);
    titleCell.appendChild(link);
    tr.appendChild(titleCell);
    appendCell(tr, Array.isArray(p.authors) ? p.authors.join(', ') : text(p.authors), 'authors-cell');
    const keywordCell = document.createElement('td');
    keywordCell.className = 'keywords-cell';
    (p.highlights || []).forEach(h => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = h;
      keywordCell.appendChild(chip);
    });
    if (!keywordCell.children.length) keywordCell.textContent = '—';
    tr.appendChild(keywordCell);
    appendCell(tr, text(p.summary, '暂无英文摘要'), 'summary-cell');
    appendCell(tr, text(p.abstract_cn || p.overview_cn, '暂无中文概述'), 'cn-cell');
    appendCell(tr, text(p.reading_notes || p.keyword_extract, '暂无阅读导览'), 'notes-cell');
    tbody.appendChild(tr);
  });
}
function appendCell(row, value, className = '') {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = value;
  row.appendChild(td);
  return td;
}
async function init() {
  const savedTheme = localStorage.getItem('paper_digest_v2_theme');
  if (savedTheme === 'dark') document.documentElement.classList.add('dark');
  $('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('paper_digest_v2_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });
  $('searchBox').addEventListener('input', e => { state.query = e.target.value; renderPapers(); });
  $('sourceFilter').addEventListener('change', e => { state.source = e.target.value; renderPapers(); });
  $('priorityFilter').addEventListener('change', e => { state.priority = e.target.value; renderPapers(); });
  try {
    const res = await fetch('./data/latest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.digest = await res.json();
    state.papers = (state.digest.papers || []).map(normalizePaper);
    renderSummary(state.digest);
    renderSources();
    renderPapers();
  } catch (err) {
    const message = `加载 data/latest.json 失败：${err.message}`;
    $('paperList').innerHTML = `<div class="error">${message}</div>`;
    $('paperTable').hidden = true;
    $('paperTableEmpty').textContent = message;
    $('paperTableEmpty').className = 'error';
    $('paperTableEmpty').hidden = false;
  }
}
init();
