(() => {
  const $ = selector => document.querySelector(selector);
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); } catch { /* 正文不依赖本机存储 */ } };
  const savedTheme = get('book-theme');
  if (['dark', 'light'].includes(savedTheme)) document.documentElement.dataset.theme = savedTheme;
  let font = Number(get('book-font')) || 18;
  function applyFont(value) { font = Math.min(24, Math.max(16, value)); document.documentElement.style.setProperty('--reading-size', `${font}px`); set('book-font', String(font)); }
  applyFont(font);
  $('#font-smaller')?.addEventListener('click', () => applyFont(font - 1));
  $('#font-larger')?.addEventListener('click', () => applyFont(font + 1));
  $('#theme-toggle')?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    set('book-theme', dark ? 'light' : 'dark');
  });
  const navButton = $('#nav-toggle');
  function closeNav() { document.body.classList.remove('nav-open'); navButton?.setAttribute('aria-expanded', 'false'); }
  navButton?.addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); navButton.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', event => { if (!event.target.closest('#sidebar, #nav-toggle')) closeNav(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNav(); });

  const dialog = $('#search-dialog'), input = $('#search-input'), results = $('#search-results'), status = $('#search-status');
  let searchData, loading;
  async function loadSearch() {
    if (searchData) return searchData;
    loading ??= fetch('search.json').then(response => { if (!response.ok) throw new Error('加载失败'); return response.json(); }).then(data => searchData = data).catch(error => { loading = null; throw error; });
    return loading;
  }
  function openSearch() { if (!dialog.open) dialog.showModal(); input.focus(); loadSearch().catch(() => { status.textContent = '搜索索引加载失败，请稍后重新输入；章节仍可直接阅读。'; }); }
  $('#search-open')?.addEventListener('click', openSearch);
  $('#search-close')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  document.addEventListener('keydown', event => { if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { event.preventDefault(); openSearch(); } });
  let queryVersion = 0;
  input?.addEventListener('input', async () => {
    const query = input.value.trim().toLocaleLowerCase(), version = ++queryVersion;
    results.replaceChildren();
    if (!query) { status.textContent = '输入关键词，查找相关章节。'; return; }
    try {
      const data = await loadSearch();
      if (version !== queryVersion) return;
      const terms = query.split(/\s+/);
      const matches = data.filter(item => terms.every(term => `${item.title} ${item.text}`.toLocaleLowerCase().includes(term)));
      status.textContent = matches.length ? `找到 ${matches.length} 个相关章节` : '没有找到结果，请换一个关键词。';
      for (const item of matches) {
        const a = document.createElement('a'), heading = document.createElement('strong'), snippet = document.createElement('span');
        a.href = `${item.slug}.html`; a.className = 'search-result'; heading.textContent = item.title;
        const index = item.text.toLocaleLowerCase().indexOf(terms[0]);
        const start = Math.max(0, index - 36);
        snippet.textContent = `${start ? '…' : ''}${item.text.slice(start, start + 150)}…`;
        a.append(heading, snippet); results.append(a);
      }
    } catch { if (version === queryVersion) status.textContent = '搜索索引暂时无法加载，请从左侧目录阅读。'; }
  });

  const slug = document.body.dataset.chapter;
  const headings = [...document.querySelectorAll('article h2')];
  if (slug && slug !== 'all') {
    let ticking = false;
    function track() {
      ticking = false;
      const heading = [...headings].reverse().find(item => item.getBoundingClientRect().top < 140);
      const anchor = heading?.id || '';
      set('book-last', JSON.stringify({ slug, anchor, title: document.title.split(' · ')[0] }));
      document.querySelectorAll('.page-toc a').forEach(a => a.classList.toggle('active', a.hash === `#${anchor}`));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(track); } }, { passive: true });
    track();
  } else if (!slug) {
    try {
      const last = JSON.parse(get('book-last'));
      if (last && /^[a-z0-9-]+$/.test(last.slug)) {
        const a = $('#continue-reading'); a.href = `${last.slug}.html${last.anchor ? `#${encodeURIComponent(last.anchor)}` : ''}`;
        a.textContent = `继续阅读：${last.title}`; a.hidden = false;
      }
    } catch { /* 无历史时显示正常首页 */ }
  }
  $('#print-book')?.addEventListener('click', () => window.print());
})();
