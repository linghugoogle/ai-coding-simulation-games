import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../site/reader.js',import.meta.url),'utf8');
const css=await fs.readFile(new URL('../site/style.css',import.meta.url),'utf8');
const {chapters}=JSON.parse(await fs.readFile(new URL('../book.json',import.meta.url),'utf8'));
const scrollPadding=parseFloat(css.match(/html\s*\{[^}]*scroll-padding-top:([^;]+);/)[1]);
const scrollMargin=parseFloat(css.match(/\.book-chapter\s*\{[^}]*scroll-margin-top:([^;]+);/)[1]);

function reader({hash='',start=''}={}){
  const events=new Map(),frames=[],saved=new Map();
  const element=()=>({attributes:{},dataset:{},classList:{toggle(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(type,callback){this[type]=callback;}});
  const position=element(),progress=element();
  const context={console,innerHeight:700,scrollY:0,location:{hash},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},requestAnimationFrame:fn=>frames.push(fn)};
  const articles=chapters.map((chapter,index)=>Object.assign(element(),{
    id:`chapter-${chapter.slug}`,dataset:{slug:chapter.slug,title:chapter.title},
    getBoundingClientRect:()=>({top:index*1000-context.scrollY}),
    scrollIntoView(){context.scrollY=Math.max(0,index*1000-scrollPadding-scrollMargin);}
  }));
  const links=chapters.map(chapter=>Object.assign(element(),{dataset:{chapterLink:chapter.slug}}));
  const toc=chapters.map(chapter=>({dataset:{toc:chapter.slug},hidden:false}));
  context.document={
    body:{dataset:{reading:'true',start},classList:{remove(){}}},
    documentElement:{style:{setProperty(){}},scrollHeight:chapters.length*1000},
    querySelector:selector=>({'#reading-position':position,'#reading-progress':progress}[selector]||null),
    querySelectorAll:selector=>({'.book-chapter':articles,'.book-chapter h2':[],'[data-chapter-link]':links,'[data-toc]':toc,'.page-toc a':[]}[selector]||[]),
    getElementById:id=>articles.find(article=>article.id===id),
    addEventListener(){}
  };
  context.window={addEventListener:(name,callback)=>events.set(name,callback)};
  context.getComputedStyle=()=>({scrollPaddingTop:`${scrollPadding}px`});
  context.history={pushState:(_a,_b,url)=>context.location.hash=url,replaceState:(_a,_b,url)=>context.location.hash=url};
  vm.runInNewContext(source,context);
  function flush(){while(frames.length)frames.shift()();}
  events.get('load')();flush();
  const current=()=>links.find(link=>link.attributes['aria-current']==='location')?.dataset.chapterLink;
  return {context,articles,links,toc,position,current,flush,
    click(slug){links.find(link=>link.dataset.chapterLink===slug).click({preventDefault(){}});flush();},
    scroll(y){context.scrollY=y;events.get('scroll')();flush();}
  };
}

test('逐章点击后正文定位、目录高亮、右侧目录与章节一致',()=>{
  const page=reader();
  for(const {slug,title}of [...chapters,...chapters.toReversed()]){
    page.click(slug);
    assert.equal(page.current(),slug,`点击 ${slug} 不应选中上一章`);
    assert.ok(page.position.textContent.startsWith(title));
    assert.equal(page.toc.filter(item=>!item.hidden)[0].dataset.toc,slug);
    assert.equal(page.context.location.hash,`#chapter-${slug}`);
  }
});

test('直接打开章节锚点与旧章节入口也选择正确章节',()=>{
  assert.equal(reader({hash:'#chapter-release'}).current(),'release');
  assert.equal(reader({start:'development'}).current(),'development');
});

test('手动连续滚动仍按阅读线切换章节，不锁定点击项',()=>{
  const page=reader();const index=chapters.findIndex(chapter=>chapter.slug==='release');
  page.click('release');page.scroll(index*1000-250);assert.equal(page.current(),'testing');
  page.scroll(index*1000-scrollPadding+2);assert.equal(page.current(),'release');
  page.scroll((index+1)*1000-scrollPadding+2);assert.equal(page.current(),'iteration');
});
