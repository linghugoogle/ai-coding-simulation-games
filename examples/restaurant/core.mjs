// 规则层没有 DOM、定时器或网络依赖。时间统一为整数模拟秒。
export const DISHES = Object.freeze({
  simple: Object.freeze({ name:'简餐', price:20, cost:8, seconds:10, icon:'dish-simple' }),
  rice: Object.freeze({ name:'盖饭', price:30, cost:12, seconds:18, icon:'dish-rice' }),
  set: Object.freeze({ name:'招牌套餐', price:45, cost:20, seconds:30, icon:'dish-set' })
});
export const UPGRADES = Object.freeze({
  stove: { name:'第二工位', cost:300, day:3, help:'同时制作两单，缓解厨房排队' },
  seats: { name:'增加两座', cost:200, day:2, help:'接待上限从 4 人变为 6 人' },
  speed: { name:'高效炉灶', cost:400, day:4, help:'每单制作时间缩短 25%' }
});
export const FORECASTS = Object.freeze({
  quiet: { name:'雨天', hint:'客流偏少，留意库存与报废', chance:.55 },
  normal: { name:'平日', hint:'常规客流，可以比较菜单组合', chance:.8 },
  rush: { name:'街区活动', hint:'客流偏多，留意厨房和座位', chance:1 }
});
const fail = message => ({ok:false,message});
const ok = message => ({ok:true,message});
function random(s) { s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0; return s.rng/4294967296; }
const blankReport = () => ({ revenue:0, foodCost:0, waste:0, purchased:0, investment:0, served:0, arrivals:0, lost:{stock:0,wait:0,seats:0,price:0}, fixed:0 });
function forecast(s) { if(s.stage===1)return 'normal'; const r=random(s); return r<.2?'quiet':r<.75?'normal':'rush'; }
function log(s,message) { s.log.unshift(message); s.log=s.log.slice(0,12); }
export function inventoryValue(s) { return Object.entries(DISHES).reduce((n,[id,d])=>n+s.inventory[id]*d.cost,0); }
export function createGame({seed=20261018,stage=3}={}) {
  const s={schemaVersion:1,stage:[1,2,3].includes(stage)?stage:3,rng:seed>>>0,day:1,phase:'planning',cash:1000,dayStartCash:1000,dayStartInventory:0,assetValue:0,dayStartAssets:0,inventory:{simple:0,rice:0,set:0},menu:['simple'],price:1,upgrades:{stove:false,seats:false,speed:false},orders:[],clock:0,nextId:1,report:blankReport(),history:[],badges:[],servedTotal:0,log:[]};
  s.forecast=forecast(s); log(s,'先采购食材，再开始营业。每一天都可以调整计划。'); return s;
}
export function purchase(s,id,quantity=5) {
  if(s.phase!=='planning')return fail('只能在营业前采购');
  if(!Object.hasOwn(DISHES,id)||(s.stage===1&&id!=='simple'))return fail('此阶段不提供该菜品');
  if(!Number.isInteger(quantity)||quantity<1||quantity>100)return fail('数量须为 1—100 的整数');
  const cost=DISHES[id].cost*quantity;
  if(s.cash<cost)return fail(`现金不足，需要 ${cost}`);
  s.cash-=cost;s.inventory[id]+=quantity;s.report.purchased+=cost;
  log(s,`采购 ${quantity} 份${DISHES[id].name}食材，支出 ${cost}`);return ok('采购成功');
}
export function setMenu(s,ids,price=1) {
  if(s.phase!=='planning')return fail('营业中不能改变已接订单的菜单');
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!Object.hasOwn(DISHES,id))||![.8,1,1.25].includes(price))return fail('菜单与价格不合法');
  if(s.stage===1&&(ids.length!==1||ids[0]!=='simple'||price!==1))return fail('第一阶段只经营原价简餐');
  s.menu=[...ids];s.price=price;return ok('菜单已更新');
}
export function buyUpgrade(s,id) {
  const u=UPGRADES[id];
  if(!Object.hasOwn(UPGRADES,id)||!u||s.stage<3||s.phase!=='planning')return fail('此时不能升级');
  if(s.upgrades[id])return fail('已经购买');
  if(s.day<u.day)return fail(`第 ${u.day} 天解锁`);
  if(s.cash<u.cost)return fail('现金不足');
  s.cash-=u.cost;s.assetValue+=u.cost;s.report.investment+=u.cost;s.upgrades[id]=true;
  log(s,`购入${u.name}，支出 ${u.cost}`);return ok('升级完成');
}
export function startDay(s) {
  if(s.phase!=='planning')return fail('今天已经开门');
  if(!s.menu.some(id=>s.inventory[id]>0))return fail('请先为菜单上的菜采购食材');
  s.phase='open';s.clock=0;log(s,`开始第 ${s.day} 天营业：${FORECASTS[s.forecast].name}`);return ok('开门营业');
}
function active(s){return s.orders.filter(o=>!['left','cancelled'].includes(o.status));}
function arrive(s){
  s.report.arrivals++;
  const id=s.menu[Math.floor(random(s)*s.menu.length)], dish=DISHES[id];
  const acceptance=s.price===1.25?.65:s.price===.8?1:.9;
  if(random(s)>acceptance){s.report.lost.price++;return;}
  if(active(s).length>=(s.upgrades.seats?6:4)){s.report.lost.seats++;return;}
  s.orders.push({id:s.nextId++,dish:id,price:Math.round(dish.price*s.price),status:'waiting',wait:0,remaining:0,spent:0,eating:0});
}
function settle(s){
  if(!['open','closing'].includes(s.phase))return;
  if(s.stage>=2){
    for(const [id,d] of Object.entries(DISHES)){
      const spoiled=Math.floor(s.inventory[id]*.2);s.inventory[id]-=spoiled;s.report.waste+=spoiled*d.cost;
    }
  }
  s.cash-=120;s.report.fixed=120;
  const r=s.report;r.profit=r.revenue-r.foodCost-r.waste-r.fixed;r.endingCash=s.cash;r.inventoryValue=inventoryValue(s);r.assetValue=s.assetValue;
  r.cashChange=s.cash-s.dayStartCash;r.equityChange=s.cash+r.inventoryValue+s.assetValue-s.dayStartCash-s.dayStartInventory-s.dayStartAssets;
  s.servedTotal+=r.served;
  if(!s.badges.includes('first-service')&&r.served>0){s.badges.push('first-service');log(s,'收获：完成第一单，记住你的第一位顾客。');}
  if(!s.badges.includes('twelve')&&r.served>=12){s.badges.push('twelve');log(s,'收获：单日服务 12 人，获得“顺畅营业”纪念。');}
  if(!s.badges.includes('profitable')&&r.profit>0){s.badges.push('profitable');log(s,'收获：第一次日利润为正。');}
  s.history.push({...structuredClone(r),day:s.day});
  s.phase=s.cash<0?'bankrupt':s.day>=7?'complete':'report';
  log(s,`打烊：服务 ${r.served} 人，日利润 ${r.profit}，现金 ${s.cash}`);
}
export function advance(s,seconds=1){
  if(!Number.isInteger(seconds)||seconds<0||seconds>600)throw new Error('推进时间须为 0—600 的整数秒');
  for(let t=0;t<seconds;t++){
    if(!['open','closing'].includes(s.phase))break;
    s.clock++;
    if(s.phase==='open'&&s.clock<=180&&s.clock%6===0&&random(s)<FORECASTS[s.forecast].chance)arrive(s);
    if(s.clock>=180)s.phase='closing';
    for(const o of active(s)){
      if(o.status==='eating'){o.eating--;if(o.eating<=0)o.status='left';continue;}
      o.wait++;
      if(o.wait>=45){o.status='cancelled';s.report.lost.wait++;s.report.waste+=o.spent;continue;}
      if(o.status==='cooking'){
        o.remaining--;
        if(o.remaining<=0){o.status='eating';o.eating=10;s.cash+=o.price;s.report.revenue+=o.price;s.report.foodCost+=o.spent;s.report.served++;}
      }
    }
    let free=(s.upgrades.stove?2:1)-s.orders.filter(o=>o.status==='cooking').length;
    for(const o of s.orders.filter(o=>o.status==='waiting')){
      if(free<=0)break;
      if(s.inventory[o.dish]<=0){o.status='cancelled';s.report.lost.stock++;continue;}
      const d=DISHES[o.dish];s.inventory[o.dish]--;o.spent=d.cost;o.remaining=Math.ceil(d.seconds*(s.upgrades.speed?.75:1));o.status='cooking';free--;
    }
    if(s.phase==='closing'&&active(s).length===0)settle(s);
  }
  return s;
}
export function nextDay(s){
  if(s.phase!=='report')return fail('请先完成今天的营业');
  s.day++;s.phase='planning';s.clock=0;s.orders=[];s.report=blankReport();s.dayStartCash=s.cash;s.dayStartInventory=inventoryValue(s);s.dayStartAssets=s.assetValue;s.forecast=forecast(s);
  log(s,`第 ${s.day} 天预告：${FORECASTS[s.forecast].hint}`);return ok('进入下一天');
}
export function restoreGame(raw){
  if(typeof raw==='string'&&raw.length>200000)throw new Error('存档体积异常');
  const s=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
  const integer=(value,min=0,max=10000000)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  if(!s||s.schemaVersion!==1||!['planning','report','bankrupt','complete'].includes(s.phase)||!integer(s.cash,-10000)||!integer(s.day,1,7)||![1,2,3].includes(s.stage)||!integer(s.rng,0,4294967295))throw new Error('存档版本或状态无效');
  const reference=createGame({stage:s.stage});
  for(const key of ['dayStartCash','dayStartInventory','assetValue','dayStartAssets','clock','nextId','servedTotal'])if(!integer(s[key],key==='dayStartCash'?-10000:0))throw new Error('存档数值无效');
  if(!s.inventory||Object.keys(DISHES).some(id=>!integer(s.inventory[id],0,100000))||!s.upgrades||Object.keys(UPGRADES).some(id=>typeof s.upgrades[id]!=='boolean'))throw new Error('存档库存或升级无效');
  if(!Array.isArray(s.menu)||!s.menu.length||new Set(s.menu).size!==s.menu.length||s.menu.some(id=>!Object.hasOwn(DISHES,id))||![.8,1,1.25].includes(s.price)||!Object.hasOwn(FORECASTS,s.forecast))throw new Error('存档菜单无效');
  if(!s.report||Object.keys(reference.report).filter(k=>k!=='lost').some(k=>!integer(s.report[k],k==='fixed'?0:0))||!s.report.lost||Object.keys(reference.report.lost).some(k=>!integer(s.report.lost[k])))throw new Error('存档报表无效');
  for(const key of ['profit','endingCash','inventoryValue','assetValue','cashChange','equityChange'])if(s.phase!=='planning'&&!integer(s.report[key],['profit','endingCash','cashChange','equityChange'].includes(key)?-100000:0))throw new Error('存档结算无效');
  if(!Array.isArray(s.orders)||!Array.isArray(s.history)||s.history.length>7||!Array.isArray(s.badges)||s.badges.some(b=>!['first-service','twelve','profitable'].includes(b))||!Array.isArray(s.log)||s.log.some(x=>typeof x!=='string'||x.length>300))throw new Error('存档记录无效');
  // 非营业阶段不恢复运行中的对象；避免导入文件混入任务状态。
  s.orders=[];s.log=s.log.slice(0,12);return s;
}
