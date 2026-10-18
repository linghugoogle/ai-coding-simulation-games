import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,purchase,setMenu,startDay,advance,nextDay,buyUpgrade,restoreGame,inventoryValue} from '../examples/restaurant/core.mjs';
const open = (options={}) => {const s=createGame(options);purchase(s,'simple',20);assert.ok(startDay(s).ok);return s;};
test('采购拒绝无效或透支命令，不修改状态',()=>{
 const s=createGame();const before=structuredClone(s);
 for(const [id,n] of [['simple',101],['simple',-1],['simple',.5],['unknown',5]])assert.equal(purchase(s,id,n).ok,false);
 assert.deepEqual(s,before);purchase(s,'simple',100);assert.equal(purchase(s,'simple',30).ok,false);
});
test('重复开门被拒绝，相同种子相同输入得到相同整天结果',()=>{
 const a=open(),b=open();assert.equal(startDay(a).ok,false);advance(a,600);advance(b,600);assert.deepEqual(a,b);assert.equal(a.phase,'report');
});
test('守恒：收入、消耗、损耗、库存与设备资产对应利润',()=>{
 const s=open();advance(s,600);const r=s.report;
 assert.equal(r.cashChange,r.revenue-r.purchased-r.investment-r.fixed);
 assert.equal(r.profit,r.equityChange);
 assert.ok(Object.values(s.inventory).every(n=>n>=0));
 const cash=s.cash;advance(s,600);assert.equal(s.cash,cash,'结算不会重复扣费');
});
test('七日经营可以完成，升级不可重复购买且资产变化守恒',()=>{
 const s=createGame({stage:3});
 for(let day=1;day<=7;day++){
  if(day===3&&s.cash>=300){assert.ok(buyUpgrade(s,'stove').ok);assert.equal(buyUpgrade(s,'stove').ok,false);}
  const needed=Math.max(0,20-s.inventory.simple);assert.ok(purchase(s,'simple',Math.max(1,needed)).ok);
  assert.ok(startDay(s).ok);advance(s,600);assert.equal(s.report.profit,s.report.equityChange);if(day<7)assert.ok(nextDay(s).ok);
 }
 assert.equal(s.phase,'complete');assert.equal(s.history.length,7);assert.ok(s.badges.includes('first-service'));assert.ok(s.cash>=0);
});
test('阶段一只允许简餐，菜单不能空、营业时不能采购',()=>{
 const s=createGame({stage:1});assert.equal(setMenu(s,[]).ok,false);assert.equal(setMenu(s,['rice']).ok,false);assert.equal(purchase(s,'rice').ok,false);
 purchase(s,'simple',10);startDay(s);assert.equal(purchase(s,'simple').ok,false);assert.equal(buyUpgrade(s,'seats').ok,false);
});
test('存档恢复与拒绝损坏状态，拒绝带恶意报表内容的输入',()=>{
 const s=open();advance(s,600);const loaded=restoreGame(JSON.stringify(s));assert.equal(loaded.cash,s.cash);assert.equal(inventoryValue(loaded),inventoryValue(s));
 assert.throws(()=>restoreGame('{'));assert.throws(()=>restoreGame({...s,cash:'1000'}));assert.throws(()=>restoreGame({...s,report:{...s.report,profit:'<img src=x onerror=alert(1)>'}}));
 assert.throws(()=>restoreGame({...s,phase:'open'}));
});
