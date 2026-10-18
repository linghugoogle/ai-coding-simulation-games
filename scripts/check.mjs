import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'book.json'), 'utf8'));
const stats = JSON.parse(await fs.readFile(path.join(out, 'stats.json'), 'utf8'));
assert.ok(stats.total > 10000 && stats.total <= 40000, `字数异常：${stats.total}`);
assert.equal(new Set(config.chapters.map(ch => ch.slug)).size, config.chapters.length);
const files = await fs.readdir(out);
let checked = 0;
for (const file of files.filter(file => file.endsWith('.html'))) {
  const source = await fs.readFile(path.join(out, file), 'utf8');
  assert.ok(source.includes('lang="zh-CN"'), `页面缺少中文语言：${file}`);
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `重复锚点：${file}`);
  for (const [, url] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    const [target, anchor] = url.split('#');
    const resolved = target ? path.resolve(out, target.split('?')[0]) : path.join(out, file);
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
for (const chapter of config.chapters) {
  const source = await fs.readFile(path.join(root, chapter.file), 'utf8');
  assert.ok(source.trim().length > 400, `章节过短：${chapter.file}`);
  assert.ok(!/TODO|待补充|敬请期待/.test(source), `存在占位内容：${chapter.file}`);
}
console.log(`Checked ${files.filter(file => file.endsWith('.html')).length} pages, ${checked} internal references, ${stats.total} words.`);
