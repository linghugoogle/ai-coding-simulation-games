import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'book.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = source => source.replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#>*_`|~-]/g, '');
const count = source => (plain(source).match(/[\p{Script=Han}]|[a-zA-Z0-9]+/gu) ?? []).length;

const chapters = await Promise.all(config.chapters.map(async chapter => {
  const source = await fs.readFile(path.join(root, chapter.file), 'utf8');
  const sections = [];
  let n = 0;
  let html = marked.parse(source, { gfm: true, breaks: false });
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (match, level, title) => {
    const id = `${chapter.slug}-section-${++n}`;
    if (+level === 2) sections.push({ id, title: title.replace(/<[^>]+>/g, '') });
    return `<h${level} id="${id}">${title}</h${level}>`;
  });
  html = html.replace(/href="([^"#]+\.md)(#[^"]*)?"/g, (match, href, hash = '') => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(chapter.file), href));
    const other = config.chapters.find(item => item.file === target);
    if (other) return `href="${other.slug}.html${hash}"`;
    if (target.startsWith('templates/')) return `href="${escape(target)}${hash}"`;
    return match;
  });
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  return { ...chapter, source, html, sections, count: count(source), minutes: Math.max(1, Math.ceil(count(source) / 350)) };
}));

const total = chapters.reduce((sum, item) => sum + item.count, 0);
if (total > 40000) throw new Error(`正文超过 40,000 字：${total}`);
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
await fs.cp(path.join(root, 'site'), path.join(out, 'assets'), { recursive: true });
await fs.cp(path.join(root, 'templates'), path.join(out, 'templates'), { recursive: true });
await fs.cp(path.join(root, 'examples'), path.join(out, 'examples'), { recursive: true });
await fs.copyFile(path.join(root, 'LICENSE'), path.join(out, 'LICENSE.txt'));
await fs.writeFile(path.join(out, '.nojekyll'), '');

function shell({ title, slug = '', body, toc = '', description = config.description }) {
  const nav = chapters.map(item => `<a href="${item.slug}.html" ${item.slug === slug ? 'aria-current="page"' : ''}><span>${escape(item.label)}</span>${escape(item.title)}</a>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${escape(description)}"><meta name="color-scheme" content="light dark">
<title>${escape(title)} · ${escape(config.title)}</title>
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/style.css">
<script src="assets/reader.js" defer></script></head>
<body data-chapter="${escape(slug)}"><a class="skip" href="#main">跳至正文</a>
<header class="topbar"><a class="brand" href="index.html"><span class="brand-mark">经</span><span>AI 游戏开发手册</span></a><div class="tools"><button id="search-open" type="button" aria-label="搜索全书">搜索 <kbd>/</kbd></button><button id="font-smaller" type="button" aria-label="缩小正文">A−</button><button id="font-larger" type="button" aria-label="放大正文">A+</button><button id="theme-toggle" type="button" aria-label="切换深浅主题">◐</button><button id="nav-toggle" type="button" aria-label="打开目录" aria-expanded="false" aria-controls="sidebar">目录</button></div></header>
<div class="layout"><aside class="sidebar" id="sidebar"><a class="book-title" href="index.html">用 AI Coding<br>开发模拟经营游戏</a><p class="sidebar-note">从构思到上线<br>以餐厅经营游戏为例</p><nav aria-label="全书章节">${nav}</nav><div class="sidebar-bottom"><a href="all.html">全文阅读与打印 ↗</a><a href="${config.repo}" rel="noopener">GitHub 开源仓库 ↗</a><span>v${config.version} · 首轮初稿</span></div></aside>
<main id="main">${body}<footer class="site-footer">原创内容与代码采用 <a href="LICENSE.txt">MIT 许可</a> · <a href="${config.repo}/blob/main/CONTRIBUTING.md">参与修订</a> · 更新于 ${config.updated}</footer></main>
<aside class="page-toc" aria-label="本页目录">${toc}</aside></div>
<dialog id="search-dialog" aria-labelledby="search-title"><div class="search-head"><label id="search-title" for="search-input">搜索全书</label><button id="search-close" type="button" aria-label="关闭搜索">关闭</button></div><input id="search-input" type="search" placeholder="试试：现金流、素材、上线" autocomplete="off"><p id="search-status" role="status">输入关键词，查找相关章节。</p><div id="search-results"></div></dialog>
<noscript><p class="noscript">正文可直接阅读。搜索、字号和进度需要启用 JavaScript。</p></noscript>
</body></html>`;
}

const home = `<section class="hero"><div class="eyebrow">开源实践小册子 / v${config.version}</div><h1>用 AI Coding<br>开发模拟经营游戏</h1><p class="hero-subtitle">从构思到上线，以一家餐厅为例。</p><p class="hero-description">把一个经营游戏想法变成可玩的作品。学习调研与设计，组织 AI 写代码、制作素材，再完成测试、发布和第一次更新。</p><div class="hero-actions"><a class="primary" href="preface.html">开始阅读 <span>→</span></a><a class="secondary" href="${config.repo}">查看 GitHub</a><a id="continue-reading" hidden>继续上次阅读</a></div><div class="book-meta"><span>9 章完整流程</span><span>${total.toLocaleString('en-US')} 字初稿</span><span>4 万字以内</span><span>免费开放阅读</span></div></section>
<section class="path-section"><div class="section-kicker">一条可以完成的路线</div><h2>想法 → 原型 → 作品 → 上线</h2><p>以方法为主线，以餐厅为案例。你学到的是推进游戏项目的能力，也可以把它用在农场、商店和工厂中。</p><div class="workflow"><span>01 调研与构思</span><span>02 玩法与原型</span><span>03 美术与开发</span><span>04 测试与发布</span></div></section>
<section class="contents"><div class="section-kicker">阅读目录</div><h2>从第一步，走到第一次更新</h2><div class="chapter-grid">${chapters.filter(item => /^\d\d$/.test(item.label)).map(item => `<a class="chapter-card" href="${item.slug}.html"><span class="chapter-number">${item.label}</span><div><h3>${escape(item.title)}</h3><p>${item.count.toLocaleString('en-US')} 字 · 约 ${item.minutes} 分钟</p></div><span class="card-arrow">↗</span></a>`).join('')}</div></section>
<section class="note-panel"><h2>带着自己的项目来读</h2><p>每章提供方法、案例、AI 任务示例与验收方式。配套仓库包含立项、调研、任务和发布模板，以及可运行的经济模型。</p><p>当前是首轮书稿，尚未附完整餐厅成品、美术包或真人试玩数据。欢迎指出错误、提交实践反馈，一起把过程写得更扎实。</p><div class="resource-links"><a href="toolkit.html">打开工具包 →</a><a href="references.html">资料与验证边界 →</a><a href="book.md" download>下载 Markdown 全文 ↓</a></div></section>`;
await fs.writeFile(path.join(out, 'index.html'), shell({ title: '首页', body: home }));

for (let i = 0; i < chapters.length; i++) {
  const chapter = chapters[i], prev = chapters[i - 1], next = chapters[i + 1];
  const pagination = `<nav class="pagination" aria-label="章节翻页">${prev ? `<a href="${prev.slug}.html"><small>上一篇</small><span>← ${escape(prev.title)}</span></a>` : '<span></span>'}${next ? `<a href="${next.slug}.html"><small>下一篇</small><span>${escape(next.title)} →</span></a>` : `<a href="index.html"><small>完成阅读</small><span>返回首页 →</span></a>`}</nav>`;
  const body = `<div class="reading-meta"><a href="index.html">全书</a><span>/ ${escape(chapter.label)}</span><span>${chapter.count} 字 · 约 ${chapter.minutes} 分钟</span></div><article class="prose">${chapter.html}</article>${pagination}<div class="chapter-feedback"><span>发现错误或有实践反馈？</span><a href="${config.repo}/issues/new?title=${encodeURIComponent(`[${chapter.title}] `)}">提交本章反馈 ↗</a></div>`;
  const toc = `<span class="toc-title">本章内容</span>${chapter.sections.map(item => `<a href="#${item.id}">${item.title}</a>`).join('')}`;
  await fs.writeFile(path.join(out, `${chapter.slug}.html`), shell({ title: chapter.title, slug: chapter.slug, body, toc }));
}

const all = `<div class="reading-meta">全文版 · ${total} 字 · <button type="button" id="print-book">打印或保存 PDF</button></div><div class="print-cover"><h1>${escape(config.title)}</h1><p>${escape(config.subtitle)}</p><p>v${config.version} · ${config.updated} · 首轮初稿</p></div>${chapters.map(item => `<article class="prose full-chapter">${item.html}</article>`).join('')}`;
await fs.writeFile(path.join(out, 'all.html'), shell({ title: '全文阅读与打印', slug: 'all', body: all }));
await fs.writeFile(path.join(out, 'book.md'), `# ${config.title}\n\n${config.subtitle}\n\nv${config.version} · ${config.updated}\n\n` + chapters.map(item => item.source).join('\n\n---\n\n'));
await fs.writeFile(path.join(out, 'search.json'), JSON.stringify(chapters.map(({ slug, title, source }) => ({ slug, title, text: plain(source).replace(/\s+/g, ' ') }))));
await fs.writeFile(path.join(out, 'stats.json'), JSON.stringify({ total, limit: 40000, version: config.version, chapters: chapters.map(({ slug, count }) => ({ slug, count })) }, null, 2));
await fs.writeFile(path.join(out, '404.html'), shell({ title: '页面未找到', body: '<section class="hero"><h1>这一页没有找到</h1><p>请通过章节目录继续阅读。</p><a class="primary" href="index.html">返回首页 →</a></section>' }));
console.log(`Built ${chapters.length} reading pages + full text. Count: ${total} / 40000.`);
