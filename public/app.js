/* global state */
const state = {
  items: [],
  total: 0,
  offset: 0,
  filters: { signal: '', domain: '', search: '' },
  selectedId: null,
  searchTimer: null,
};

const LIMIT = 50;

// ── Utilities ─────────────────────────────────────────────────────────────

function timeAgo(ms) {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function signalClass(level) {
  return { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[level] || 'low';
}

function domainClass(domain) {
  return { AppSec: 'appsec', IAM: 'iam', SecChampion: 'secchamp' }[domain] || '';
}

function scoreDots(score, level) {
  const filled = Math.round(score * 5);
  const cls = signalClass(level);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="score-dot${i < filled ? ` filled ${cls}` : ''}"></span>`
  ).join('');
}

function toast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── API ────────────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Stats ─────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const s = await api('/api/stats');
    document.getElementById('stat-total').textContent = `${s.total.toLocaleString()} items`;
    document.getElementById('stat-high').textContent = `${s.high} HIGH`;
    document.getElementById('stat-medium').textContent = `${s.medium} MED`;
    document.getElementById('stat-low').textContent = `${s.low} LOW`;
    document.getElementById('stat-sources').textContent = `${s.sources} sources`;
  } catch (e) {
    console.error('Stats load failed', e);
  }
}

// ── Feed ───────────────────────────────────────────────────────────────────

function buildItemHtml(item) {
  const domains = item.domains.map(d =>
    `<span class="badge ${domainClass(d.domain)}">${d.domain}</span>`
  ).join('');

  const summary = item.summary || item.executive_summary || '';
  const level = item.signal_level;
  const cls = signalClass(level);

  return `
    <div class="feed-item${state.selectedId === item.id ? ' selected' : ''}" data-id="${item.id}">
      <div class="item-meta">
        <span class="badge ${cls}">${level}</span>
        ${item.status === 'pending' ? '<span class="badge pending">pending</span>' : ''}
        ${domains}
      </div>
      <div class="item-title">${escHtml(item.title)}</div>
      ${summary ? `<div class="item-summary">${escHtml(summary)}</div>` : ''}
      <div class="item-footer">
        <span class="item-source">${escHtml(item.source_name)}</span>
        <span class="item-time">${timeAgo(item.published_at)}</span>
        <span class="item-score score-bar">
          <span class="score-dots">${scoreDots(item.relevance_score, level)}</span>
          <span>${(item.relevance_score * 100).toFixed(0)}%</span>
        </span>
      </div>
    </div>`;
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadItems(reset = false) {
  if (reset) {
    state.items = [];
    state.offset = 0;
    state.selectedId = null;
    document.getElementById('detail-panel').style.display = 'none';
  }

  document.getElementById('feed-loading').style.display = reset ? 'block' : 'none';

  const params = new URLSearchParams({ limit: LIMIT, offset: state.offset });
  if (state.filters.signal) params.set('signal', state.filters.signal);
  if (state.filters.domain) params.set('domain', state.filters.domain);
  if (state.filters.search) params.set('search', state.filters.search);

  try {
    const { items, total } = await api(`/api/items?${params}`);
    state.items = reset ? items : [...state.items, ...items];
    state.total = total;
    state.offset = state.items.length;

    document.getElementById('feed-loading').style.display = 'none';
    document.getElementById('feed-list').innerHTML = state.items.length
      ? state.items.map(buildItemHtml).join('')
      : `<div class="empty-state">⬡<p>No items match your filters.</p></div>`;

    const moreWrap = document.getElementById('load-more-wrap');
    moreWrap.style.display = state.items.length < total ? 'block' : 'none';
  } catch (e) {
    document.getElementById('feed-loading').textContent = `Error: ${e.message}`;
  }
}

// ── Detail Panel ──────────────────────────────────────────────────────────

async function showDetail(id) {
  state.selectedId = id;
  document.querySelectorAll('.feed-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });

  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  panel.style.display = 'block';
  content.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const item = await api(`/api/items/${id}`);
    content.innerHTML = renderDetail(item);
  } catch (e) {
    content.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

function renderDetail(item) {
  const level = item.signal_level;
  const cls = signalClass(level);

  const domainBars = item.domains.map(d => `
    <div class="confidence-bar">
      <span class="conf-label badge ${domainClass(d.domain)}">${d.domain}</span>
      <div class="conf-track"><div class="conf-fill" style="width:${(d.confidence * 100).toFixed(0)}%"></div></div>
      <span class="conf-pct">${(d.confidence * 100).toFixed(0)}%</span>
    </div>
    ${d.reasons?.length ? `<div class="detail-section-body" style="font-size:11px;margin-top:2px;margin-bottom:6px;color:var(--text3)">${d.reasons.slice(0,2).map(r => escHtml(r)).join(' · ')}</div>` : ''}
  `).join('');

  const frameworks = item.frameworks?.length
    ? `<div class="frameworks-list">${item.frameworks.map(f => `<span class="badge framework">${escHtml(f)}</span>`).join('')}</div>`
    : '<span style="color:var(--text3);font-size:12px">None mapped</span>';

  const techs = item.affected_technologies?.length
    ? `<div class="tech-list">${item.affected_technologies.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="detail-title"><a href="${escHtml(item.url)}" target="_blank" rel="noopener">${escHtml(item.title)}</a></div>
    <div class="detail-meta">
      <span class="badge ${cls}">${level}</span>
      <span style="font-size:12px;color:var(--text3)">${escHtml(item.source_name)}</span>
      <span style="font-size:12px;color:var(--text3)">${timeAgo(item.published_at)}</span>
      <span style="font-size:12px;color:var(--text3)">Score: ${(item.relevance_score * 100).toFixed(0)}%</span>
    </div>

    ${item.executive_summary ? `
    <div class="detail-section">
      <div class="detail-section-label">Executive Summary</div>
      <div class="detail-section-body">${escHtml(item.executive_summary)}</div>
    </div>` : ''}

    ${item.summary ? `
    <div class="detail-section">
      <div class="detail-section-label">Technical Summary</div>
      <div class="detail-section-body">${escHtml(item.summary)}</div>
    </div>` : ''}

    ${item.technical_details ? `
    <div class="detail-section">
      <div class="detail-section-label">Technical Details</div>
      <div class="detail-section-body">${escHtml(item.technical_details)}</div>
    </div>` : ''}

    ${item.why_it_matters ? `
    <div class="detail-section">
      <div class="detail-section-label">Why It Matters</div>
      <div class="detail-section-body">${escHtml(item.why_it_matters)}</div>
    </div>` : ''}

    ${item.suggested_actions ? `
    <div class="detail-section">
      <div class="detail-section-label">Suggested Actions</div>
      <div class="detail-section-body">${escHtml(item.suggested_actions)}</div>
    </div>` : ''}

    <hr class="detail-divider" />

    ${item.domains?.length ? `
    <div class="detail-section">
      <div class="detail-section-label">Domain Classification</div>
      ${domainBars}
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-label">Framework Mapping</div>
      ${frameworks}
    </div>

    ${techs ? `
    <div class="detail-section">
      <div class="detail-section-label">Affected Technologies</div>
      ${techs}
    </div>` : ''}

    <hr class="detail-divider" />
    <a class="detail-link" href="${escHtml(item.url)}" target="_blank" rel="noopener">
      Read original article ↗
    </a>`;
}

// ── Sources Modal ─────────────────────────────────────────────────────────

async function openSources() {
  document.getElementById('sources-modal').style.display = 'flex';
  await renderSources();
}

async function renderSources() {
  const list = document.getElementById('sources-list');
  list.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const sources = await api('/api/sources');
    list.innerHTML = sources.map(s => `
      <div class="source-row">
        <div>
          <div class="source-row-name">${escHtml(s.name)}</div>
          <div class="source-row-cred">Credibility: ${(s.credibility_score * 100).toFixed(0)}%</div>
        </div>
        <button
          class="source-toggle${s.enabled ? ' on' : ''}"
          data-source-id="${s.id}"
          data-enabled="${s.enabled ? '1' : '0'}"
          title="${s.enabled ? 'Disable' : 'Enable'}">
        </button>
      </div>
    `).join('') || '<div class="loading">No sources. Click "Seed sources" to add defaults.</div>';

    list.querySelectorAll('.source-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.sourceId;
        const enabled = btn.dataset.enabled !== '1';
        await api(`/api/sources/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled }),
        });
        btn.classList.toggle('on', enabled);
        btn.dataset.enabled = enabled ? '1' : '0';
        toast(enabled ? 'Source enabled' : 'Source disabled');
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="loading">Error: ${e.message}</div>`;
  }
}

// ── Event Wiring ─────────────────────────────────────────────────────────

document.getElementById('feed-list').addEventListener('click', (e) => {
  const item = e.target.closest('.feed-item');
  if (item) showDetail(item.dataset.id);
});

document.getElementById('detail-close').addEventListener('click', () => {
  document.getElementById('detail-panel').style.display = 'none';
  state.selectedId = null;
  document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('selected'));
});

document.querySelectorAll('input[name=signal]').forEach(el => {
  el.addEventListener('change', () => {
    state.filters.signal = el.value;
    loadItems(true);
  });
});

document.querySelectorAll('input[name=domain]').forEach(el => {
  el.addEventListener('change', () => {
    state.filters.domain = el.value;
    loadItems(true);
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.filters.search = e.target.value.trim();
    loadItems(true);
  }, 400);
});

document.getElementById('btn-ingest').addEventListener('click', async () => {
  const btn = document.getElementById('btn-ingest');
  btn.disabled = true;
  btn.textContent = '↻ Ingesting…';
  try {
    const { ingested } = await api('/api/ingest', { method: 'POST' });
    toast(`Ingested ${ingested} raw items`);
    await loadItems(true);
    await loadStats();
  } catch (e) {
    toast(`Error: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ Ingest';
  }
});

document.getElementById('btn-enrich').addEventListener('click', async () => {
  const btn = document.getElementById('btn-enrich');
  btn.disabled = true;
  btn.textContent = '⚡ Enriching…';
  try {
    const { enriched } = await api('/api/enrich', { method: 'POST' });
    toast(`Enriched ${enriched} items with AI`);
    await loadItems(true);
    await loadStats();
  } catch (e) {
    toast(`Error: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Enrich pending';
  }
});

document.getElementById('btn-seed').addEventListener('click', async () => {
  try {
    const { seeded, message } = await api('/api/seed', { method: 'POST' });
    toast(message || `Seeded ${seeded} sources`);
    await loadStats();
  } catch (e) {
    toast(`Error: ${e.message}`);
  }
});

document.getElementById('btn-sources').addEventListener('click', openSources);
document.getElementById('sources-modal-close').addEventListener('click', () => {
  document.getElementById('sources-modal').style.display = 'none';
});
document.getElementById('sources-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

document.getElementById('btn-add-source').addEventListener('click', async () => {
  const name = document.getElementById('new-source-name').value.trim();
  const feed_url = document.getElementById('new-source-feed').value.trim();
  const source_type = document.getElementById('new-source-type').value;
  if (!name || !feed_url) { toast('Name and Feed URL required'); return; }
  try {
    await api('/api/sources', { method: 'POST', body: JSON.stringify({ name, feed_url, source_type }) });
    toast('Source added');
    document.getElementById('new-source-name').value = '';
    document.getElementById('new-source-feed').value = '';
    await renderSources();
  } catch (e) {
    toast(`Error: ${e.message}`);
  }
});

document.getElementById('btn-load-more').addEventListener('click', () => loadItems(false));

document.getElementById('btn-digest').addEventListener('click', async () => {
  document.getElementById('digest-modal').style.display = 'flex';
  document.getElementById('digest-content').textContent = 'Generating digest…';
  try {
    const { digest } = await api('/api/digest');
    document.getElementById('digest-content').textContent = digest;
  } catch (e) {
    document.getElementById('digest-content').textContent = `Error: ${e.message}`;
  }
});

document.getElementById('digest-modal-close').addEventListener('click', () => {
  document.getElementById('digest-modal').style.display = 'none';
});
document.getElementById('digest-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

document.getElementById('btn-send-digest').addEventListener('click', async () => {
  try {
    await api('/api/digest/send', { method: 'POST', body: JSON.stringify({ days: 7 }) });
    toast('Digest sent to Slack');
  } catch (e) {
    toast(`Error: ${e.message}`);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────

loadStats();
loadItems(true);
