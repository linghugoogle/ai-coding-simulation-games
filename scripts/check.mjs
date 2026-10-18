import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'book.json'), 'utf8'));
const stats = JSON.parse(await fs.readFile(path.join(out, 'stats.json'), 'utf8'));
assert.ok(stats.total > 0 && stats.total <= 40000, `正文须有内容且不超过 40,000 字：${stats.total}`);
assert.equal(new Set(config.chapters.map(ch => ch.slug)).size, config.chapters.length);
async function htmlFiles(folder) {
 const result=[];
 for(const entry of await fs.readdir(folder,{withFileTypes:true})) {
  const name=path.join(folder,entry.name);
  if(entry.isDirectory())result.push(...await htmlFiles(name));
  else if(entry.name.endsWith('.html'))result.push(path.relative(out,name));
 }
 return result;
}
const files = await htmlFiles(out);
let checked = 0;
for (const file of files.filter(file => file.endsWith('.html'))) {
  const source = await fs.readFile(path.join(out, file), 'utf8');
  assert.ok(source.includes('lang="zh-CN"'), `页面缺少中文语言：${file}`);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `重复锚点：${file}`);
  for (const [, url] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    const [target, anchor] = url.split('#');
    const resolved = target ? path.resolve(out, path.dirname(file), target.split('?')[0]) : path.join(out, file);
    assert.ok(resolved.startsWith(out + path.sep) || resolved === out, `越界路径：${url}`);
    await fs.access(resolved).catch(() => { throw new Error(`${file} 链接缺失：${url}`); });
    if (anchor && resolved.endsWith('.html')) {
      const content = resolved === path.join(out, file) ? source : await fs.readFile(resolved, 'utf8');
      assert.ok(content.includes(`id="${anchor}"`), `${file} 锚点缺失：${url}`);
    }
    checked++;
  }
}
const search = JSON.parse(await fs.readFile(path.join(out, 'search.json'), 'utf8'));
assert.equal(search.length, config.chapters.length);
assert.ok(search.some(item => item.text.includes('现金')));
assert.ok(search.some(item => item.sections?.some(section=>section.text.includes('奖励'))));
const reader=await fs.readFile(path.join(out,'read.html'),'utf8');
assert.equal((reader.match(/class="prose book-chapter"/g)||[]).length,config.chapters.length,'连续阅读必须静态包含每一章');
assert.ok(!reader.includes('class="pagination"'),'连续阅读不要求翻页');
assert.equal((reader.match(/class="teaching-figure"/g)||[]).length,11,'十一张图表须在正文中出现');
const home=await fs.readFile(path.join(out,'index.html'),'utf8');
assert.equal((home.match(/class="benefit"/g)||[]).length,6);
assert.ok(home.includes('downloads/restaurant.zip'));
await fs.access(path.join(out,'examples/restaurant/core.mjs'));
for (const chapter of config.chapters) {
  const source = await fs.readFile(path.join(root, chapter.file), 'utf8');
  assert.ok(source.trim().length > 400, `章节过短：${chapter.file}`);
  assert.ok(!/TODO|待补充|敬请期待/.test(source), `存在占位内容：${chapter.file}`);
}
console.log(`Checked ${files.filter(file => file.endsWith('.html')).length} pages, ${checked} internal references, ${stats.total} words.`);
