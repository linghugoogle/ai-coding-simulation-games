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
        const section = item.sections?.find(part => terms.some(term => `${part.title} ${part.text}`.toLocaleLowerCase().includes(term)));
        a.href = `read.html#${section?.id || `chapter-${item.slug}`}`; a.className = 'search-result'; heading.textContent = item.title;
        const index = item.text.toLocaleLowerCase().indexOf(terms[0]);
        const start = Math.max(0, index - 36);
        snippet.textContent = `${start ? '…' : ''}${item.text.slice(start, start + 150)}…`;
        a.append(heading, snippet); results.append(a);
      }
    } catch { if (version === queryVersion) status.textContent = '搜索索引暂时无法加载，请从左侧目录阅读。'; }
  });

  const reading = document.body.dataset.reading === 'true';
  const articles = [...document.querySelectorAll('.book-chapter')];
  if (reading && articles.length) {
    let ticking = false, activeSlug = '';
    const headings = [...document.querySelectorAll('.book-chapter h2')];
    function track() {
      ticking = false;
      const current = [...articles].reverse().find(item => item.getBoundingClientRect().top < 160) || articles[0];
      const heading = [...headings].reverse().find(item => item.getBoundingClientRect().top < 150 && item.closest('.book-chapter') === current);
      const anchor = heading?.id || current.id;
      const progress = Math.min(100, Math.max(0, Math.round(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100)));
      document.documentElement.style.setProperty('--book-progress', `${progress}%`);
      $('#reading-progress')?.setAttribute('aria-valuenow', String(progress));
      if ($('#reading-position')) $('#reading-position').textContent = `${current.dataset.title} · ${progress}%`;
      set('book-last', JSON.stringify({ slug: current.dataset.slug, anchor, title: current.dataset.title }));
      if (current.dataset.slug !== activeSlug) {
        activeSlug = current.dataset.slug;
        document.querySelectorAll('[data-chapter-link]').forEach(a => { if(a.dataset.chapterLink === activeSlug) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
        document.querySelectorAll('[data-toc]').forEach(nav => nav.hidden = nav.dataset.toc !== activeSlug);
      }
      document.querySelectorAll('.page-toc a').forEach(a => a.classList.toggle('active', a.hash === `#${anchor}`));
    }
    // 旧章节地址保留，但同样一次提供整本书；只改变初始阅读位置。
    const start = document.body.dataset.start;
    if (!location.hash && start) {
      history.replaceState(null,'',`#chapter-${start}`);
      document.getElementById(`chapter-${start}`)?.scrollIntoView();
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(track); } }, { passive: true });
    window.addEventListener('hashchange', () => { closeNav(); track(); });
    document.querySelectorAll('[data-chapter-link]').forEach(a => a.addEventListener('click', event => {
      const id = `chapter-${a.dataset.chapterLink}`;
      if (document.getElementById(id)) { event.preventDefault(); history.pushState(null,'',`#${id}`); document.getElementById(id).scrollIntoView(); closeNav(); track(); }
    }));
    // 图表未加载时也预留了宽高；页面就绪后再同步深链接位置与进度。
    window.addEventListener('load', () => { if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); track(); }, {once:true});
    requestAnimationFrame(track);
  } else {
    try {
      const last = JSON.parse(get('book-last'));
      if (last && /^[a-z0-9-]+$/.test(last.slug)) {
        const a = $('#continue-reading'); a.href = `read.html#${encodeURIComponent(last.anchor || `chapter-${last.slug}`)}`;
        a.textContent = `继续阅读：${last.title}`; a.hidden = false;
      }
    } catch { /* 无历史时显示正常首页 */ }
  }
  $('#print-book')?.addEventListener('click', () => window.print());
})();
