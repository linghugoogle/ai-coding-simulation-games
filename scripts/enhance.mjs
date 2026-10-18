import fs from 'node:fs/promises';
import path from 'node:path';
import {zip} from './zip.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
const config=JSON.parse(await fs.readFile(path.join(root,'book.json'),'utf8'));
const stats=JSON.parse(await fs.readFile(path.join(out,'stats.json'),'utf8'));
const figureSizes=new Map(await Promise.all((await fs.readdir(path.join(root,'site/figures'))).map(async name=>{
 const svg=await fs.readFile(path.join(root,'site/figures',name),'utf8');const view=svg.match(/viewBox="0 0 (\d+) (\d+)"/);return[name,view?{width:view[1],height:view[2]}:{width:920,height:480}];
})));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const documents=await Promise.all(config.chapters.map(async c=>({...c,html:await fs.readFile(path.join(out,`${c.slug}.html`),'utf8')})));
function paths(source){
 for(const c of config.chapters)source=source.replaceAll(`href="${c.slug}.html"`,`href="read.html#chapter-${c.slug}" data-chapter-link="${c.slug}"`);
 return source.replace(/(href|src)="\.\.\/site\//g,'$1="assets/').replace(/(href|src)="\.\.\/(examples|templates|downloads)\//g,'$1="$2/').replaceAll('首轮初稿','全流程实践版').replaceAll('assets/style.css"',`assets/style.css?v=${config.version}"`).replaceAll('assets/reader.js"',`assets/reader.js?v=${config.version}"`);
}
const articles=documents.map(c=>{
 let article=c.html.match(/<article class="prose">([\s\S]*?)<\/article>/)[1];
 article=article.replace(/<p><img src="([^"]+)" alt="([^"]*)"[^>]*><\/p>/g,(_,src,alt)=>{const size=figureSizes.get(path.basename(src))||{width:920,height:480};return `<figure class="teaching-figure"><div class="figure-scroll" tabindex="0" aria-label="图表，可横向滚动"><img src="${src}" alt="${alt}" width="${size.width}" height="${size.height}" loading="lazy" decoding="async"></div><figcaption>${alt} · <a href="${src}" target="_blank" rel="noopener">查看大图 ↗</a></figcaption></figure>`;});
 const count=stats.chapters.find(x=>x.slug===c.slug).count;
 return `<article class="prose book-chapter" id="chapter-${c.slug}" data-slug="${c.slug}" data-title="${escape(c.title)}"><div class="chapter-divider"><span>${escape(c.label)}</span><span>${count} 字 · 约 ${Math.ceil(count/350)} 分钟</span></div>${article}<div class="chapter-feedback"><span>本章有问题？</span><a href="${config.repo}/issues/new?title=${encodeURIComponent(`[${c.title}] `)}">提交反馈 ↗</a></div></article>`;
}).join('');
const toc=documents.map((c,i)=>`<nav data-toc="${c.slug}" ${i?'hidden':''}>${c.html.match(/<aside class="page-toc"[^>]*>([\s\S]*?)<\/aside>/)[1].replace('本章内容',escape(c.title))}</nav>`).join('');
const intro='<div class="reading-intro"><span>连续阅读 · 全书已加载</span><span>下滑即可进入下一章，目录随位置更新。</span></div>';
const base=documents[0].html;
const footer=base.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
function reader(start='',print=false){
 let result=base.replace(/<title>[\s\S]*?<\/title>/,`<title>连续阅读 · ${config.title}</title>`).replace(/<body data-chapter="[^"]*">/,`<body data-reading="true" data-start="${start}">`).replaceAll(' aria-current="page"','');
 result=result.replace('<div class="tools">','<div class="tools"><span id="reading-position" aria-live="off"></span>').replace('</header>','<div id="reading-progress" role="progressbar" aria-label="全书阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div></header>');
 const cover=print?`<div class="reading-meta"><button type="button" id="print-book">打印或保存 PDF</button></div><div class="print-cover"><h1>${config.title}</h1><p>${config.subtitle}</p><p>v${config.version} · ${config.updated}</p></div>`:intro;
 const content=print?articles.replaceAll('loading="lazy"','loading="eager"'):articles;
 result=result.replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${cover}${content}${footer}</main>`).replace(/<aside class="page-toc"[^>]*>[\s\S]*?<\/aside>/,`<aside class="page-toc" aria-label="当前章节目录">${toc}</aside>`);
 result=result.replace('<div class="sidebar-bottom">','<div class="sidebar-bottom"><a href="examples/restaurant/index.html?stage=3">试玩餐厅案例 ↗</a>').replace('全文阅读与打印 ↗','打印与导出 PDF ↗');
 return paths(result);
}
await fs.writeFile(path.join(out,'read.html'),reader());
for(const c of documents)await fs.writeFile(path.join(out,`${c.slug}.html`),reader(c.slug));
await fs.writeFile(path.join(out,'all.html'),reader('',true));
const features=[
 ['不会编程，也能开始','把想法告诉 AI，让它建项目、写代码、启动预览。你先玩一玩，再说要改哪里。'],
 ['没想好玩法，就看两个方案','请 AI 用一轮营业讲清区别。选你更想玩的那一种，再做成短版试。'],
 ['照着例子和 AI 说','从采购、菜单到存档，每一步都有具体说法。遇到问题，也知道怎样讲清楚。'],
 ['画面和声音，由 AI 来做','你选喜欢的样子和声音，再看它们放进游戏合不合适，不必自己画图或作曲。'],
 ['先玩一家小餐厅','案例分成三个阶段，可以在线试玩，也可以把文件交给 AI，继续做成你的版本。'],
 ['最后发给真正的玩家','让 AI 准备发布文件和页面，你确认后公开，再根据试玩意见改下一版。']
];
let home=await fs.readFile(path.join(out,'index.html'),'utf8');
home=home.replace('从构思到上线，以一家餐厅为例。','你说想做成什么样，让 AI 帮你做出来。').replace('把一个经营游戏想法变成可玩的作品。学习调研与设计，组织 AI 写代码、制作素材，再完成测试、发布和第一次更新。','不要求你会编程或设计。用一家小餐厅作例子，学习怎样提想法、选方案、试玩和修改；代码、素材、修错和打包交给 AI。');
home=home.replace('<a class="primary" href="preface.html">开始阅读 <span>→</span></a>','<a class="primary" href="read.html">连续阅读全书 <span>→</span></a>').replace(`<a class="secondary" href="${config.repo}">查看 GitHub</a>`,'<a class="secondary" href="examples/restaurant/index.html?stage=3">先玩餐厅案例 ↗</a>');
home=home.replace('<span>4 万字以内</span>','<span>11 张原创图表</span><span>3 个可玩阶段</span>');
const benefits=`<section class="selling-points"><div class="section-kicker">这本书会陪你做什么</div><h2>从“我想做一家小店”开始。</h2><div class="benefit-grid">${features.map(([title,text],i)=>`<div class="benefit"><span>0${i+1}</span><h3>${title}</h3><p>${text}</p></div>`).join('')}</div></section>`;
home=home.replace('<section class="path-section">',`${benefits}<section class="path-section">`);
home=home.replace(/<div class="workflow">[\s\S]*?<\/div>/,`<div class="stage-grid"><a href="examples/restaurant/index.html?stage=1"><b>01 先开门卖简餐</b><span>采购、制作、收款与结算</span></a><a href="examples/restaurant/index.html?stage=2"><b>02 换菜单，看客流</b><span>菜单、价格、预告与损耗</span></a><a href="examples/restaurant/index.html?stage=3"><b>03 经营七天</b><span>设备、七天目标与存档</span></a></div>`).replace('从第一步，走到第一次更新','一页读下去，无需逐章翻页。');
home=home.replace('当前是首轮书稿，尚未附完整餐厅成品、美术包或真人试玩数据。欢迎指出错误、提交实践反馈，一起把过程写得更扎实。','案例现已提供源码、原创矢量图标、合成声音与规则测试。为便于学习，布局与岗位做了简化；自由装修、独立员工寻路、背景音乐与真人试玩研究不在本版范围。');
home=home.replace('每章提供方法、案例、AI 任务示例与验收方式。配套仓库包含立项、调研、任务和发布模板，以及可运行的经济模型。','每章都围绕一件具体的事：怎样让 AI 做出采购、菜单、画面、声音或保存。附录里的示例可以直接复制，再换成自己的要求。');
home=home.replace('<div class="resource-links">','<div class="resource-links"><a href="downloads/restaurant.zip" download>下载餐厅源码 ZIP ↓</a>');
await fs.writeFile(path.join(out,'index.html'),paths(home));
await fs.mkdir(path.join(out,'downloads'),{recursive:true});
const gameFiles=await fs.readdir(path.join(root,'examples/restaurant'));
const entries=await Promise.all(gameFiles.map(async name=>[name,await fs.readFile(path.join(root,'examples/restaurant',name))]));
entries.push(['LICENSE.txt',await fs.readFile(path.join(root,'LICENSE'))]);
await fs.writeFile(path.join(out,'downloads/restaurant.zip'),zip(entries));
let markdown=await fs.readFile(path.join(out,'book.md'),'utf8');
markdown=markdown.replaceAll('../site/',`${config.site}assets/`).replaceAll('../examples/',`${config.site}examples/`).replaceAll('../downloads/',`${config.site}downloads/`).replaceAll('../templates/',`${config.site}templates/`);
await fs.writeFile(path.join(out,'book.md'),markdown);
const search=JSON.parse(await fs.readFile(path.join(out,'search.json'),'utf8'));
for(const c of documents){
 const headings=[...c.html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>([\s\S]*?)(?=<h2 |<\/article>)/g)];
 search.find(x=>x.slug===c.slug).sections=headings.map(([,id,title,text])=>({id,title,text:text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')}));
}
await fs.writeFile(path.join(out,'search.json'),JSON.stringify(search));
stats.figures=11;stats.playableStages=3;await fs.writeFile(path.join(out,'stats.json'),JSON.stringify(stats,null,2));
console.log('Enhanced continuous reading, section search, illustrated homepage, runnable case and ZIP download.');
