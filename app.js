// Progressive enhancement: the page is fully readable without this file.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  const grid = $('#grid');
  const cards = $$('.artist', grid);
  const total = cards.length;
  const controls = $('[data-controls]');
  controls.hidden = false;

  /* ---------- filter / search / sort ---------- */
  const state = { q: '', any: [], order: [], sort: 'rec' };

  function apply() {
    const q = state.q.trim().toLowerCase();
    let shown = 0;
    for (const c of cards) {
      const tags = (c.dataset.tags || '').split(' ').filter(Boolean);
      const okChip = !state.any.length || state.any.some((t) => tags.includes(t));
      const okQ = !q || c.dataset.search.includes(q);
      const visible = okChip && okQ;
      c.hidden = !visible;
      if (visible) shown++;
    }
    $('#count').textContent = `Showing ${shown} of ${total} artists`;
    $('#empty').hidden = shown !== 0;
  }

  function sortCards() {
    const key = state.sort;
    const rank = (c) => { const i = state.order.indexOf(c.dataset.id); return i === -1 ? Infinity : i; };
    const sorted = [...cards].sort((a, b) => {
      if (key === 'rec' && state.order.length) return rank(a) - rank(b) || a.dataset.name.localeCompare(b.dataset.name);
      if (key === 'followers') return Number(b.dataset.followers) - Number(a.dataset.followers) || a.dataset.name.localeCompare(b.dataset.name);
      if (key === 'studio') return a.dataset.studio.localeCompare(b.dataset.studio) || a.dataset.name.localeCompare(b.dataset.name);
      return a.dataset.name.localeCompare(b.dataset.name);
    });
    sorted.forEach((c) => grid.appendChild(c));
  }

  $('#q').addEventListener('input', (e) => { state.q = e.target.value; apply(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; sortCards(); });
  $$('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      state.any = chip.dataset.any ? chip.dataset.any.split(' ').filter(Boolean) : [];
      state.order = chip.dataset.order ? chip.dataset.order.split(' ').filter(Boolean) : [];
      sortCards();
      apply();
    });
  });

  /* ---------- shortlist ---------- */
  const KEY = 'tsa-shortlist-v1';
  let saved = new Set(store.get(KEY, []).filter((id) => cards.some((c) => c.dataset.id === id)));
  const byId = (id) => cards.find((c) => c.dataset.id === id);

  function renderShortlist() {
    $$('.save').forEach((b) => {
      const on = saved.has(b.dataset.id);
      b.setAttribute('aria-pressed', String(on));
      $('.save-label', b).textContent = on ? 'Saved' : 'Add to shortlist';
    });
    const box = $('#shortlist');
    box.hidden = saved.size === 0;
    $('#shortlist-n').textContent = `(${saved.size})`;
    const list = $('#shortlist-list');
    list.replaceChildren(
      ...[...saved].map((id) => {
        const c = byId(id);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = c.dataset.name;
        li.append(a, ` · ${c.dataset.studio}`);
        return li;
      })
    );
    store.set(KEY, [...saved]);
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.save');
    if (!b) return;
    const id = b.dataset.id;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    renderShortlist();
  });

  $('#clear').addEventListener('click', () => { saved.clear(); renderShortlist(); $('#copy-status').textContent = ''; });

  $('#copy').addEventListener('click', async () => {
    const lines = [...saved].map((id) => {
      const c = byId(id);
      const link = $('a.btn', c).href;
      return `- ${c.dataset.name} (${c.dataset.studio}) ${link}`;
    });
    const text = `My San Antonio tattoo artist shortlist\n${lines.join('\n')}`;
    const status = $('#copy-status');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied.';
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); status.textContent = 'Copied.'; }
      catch { status.textContent = 'Copy failed. Select the list and copy it manually.'; }
      ta.remove();
    }
  });

  /* ---------- checklist ---------- */
  const CKEY = 'tsa-checklist-v1';
  const done = new Set(store.get(CKEY, []));
  const boxes = $$('[data-check]');
  function renderChecks() {
    boxes.forEach((b) => { b.checked = done.has(b.dataset.check); });
    $('#progress').textContent = `${done.size} of ${boxes.length} done`;
    store.set(CKEY, [...done]);
  }
  boxes.forEach((b) => b.addEventListener('change', () => {
    b.checked ? done.add(b.dataset.check) : done.delete(b.dataset.check);
    renderChecks();
  }));

  renderShortlist();
  renderChecks();
  apply();
})();
