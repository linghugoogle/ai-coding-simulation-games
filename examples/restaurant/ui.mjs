import {DISHES,UPGRADES,FORECASTS,createGame,purchase,setMenu,buyUpgrade,startDay,advance,nextDay,restoreGame} from './core.mjs';
const $=selector=>document.querySelector(selector);
const requested=Number(new URLSearchParams(location.search).get('stage'))||3;
let state=createGame({stage:requested}),paused=false,speed=1,accumulator=0,lastTime=performance.now(),audio=null,audioOn=false;
const storageKey=`corner-restaurant-stage-${state.stage}-v1`;
const names={'first-service':'第一位顾客','twelve':'单日 12 人','profitable':'第一次盈利'};
let seenServed=0;
function tone(frequency=660,duration=.1){
  if(!audioOn||!audio)return;
  const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=frequency;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration);
}
function message(text){$('#message').textContent=text;}
function command(action){const r=action();message(r.message);if(r.ok)tone(440,.06);render();}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
  document.querySelectorAll('[data-min-stage]').forEach(el=>el.hidden=state.stage<Number(el.dataset.minStage));
  const planning=state.phase==='planning',running=['open','closing'].includes(state.phase);
  const phase={planning:'准备中',open:'营业中',closing:'停止接单 · 完成尾单',report:'打烊结算',complete:'七天完成',bankrupt:'现金不足，经营结束'}[state.phase];
  $('#stats').innerHTML=`<div><span>经营日</span><strong>${state.day} / 7</strong></div><div><span>现金</span><strong>${state.cash}</strong></div><div><span>已服务</span><strong>${state.report.served} 人</strong></div><div><span>${escape(phase)}</span><strong>${Math.min(state.clock,180)} / 180 秒</strong></div>`;
  $('#forecast').textContent=`今日预告：${FORECASTS[state.forecast].name} · ${FORECASTS[state.forecast].hint}${state.stage===1?' · 第一阶段不报废食材':''}`;
  $('#start').hidden=!planning;$('#pause').hidden=!running;$('#speed').hidden=!running;
  $('#pause').textContent=paused?'继续':'暂停';$('#speed').textContent=`速度 ×${speed}`;
  const menu=$('#menu');
  // 表单只在状态变化时重建，避免计时刷新抢走键盘焦点。
  const formKey=`${state.phase}-${JSON.stringify(state.inventory)}-${state.cash}-${state.menu.join(',')}`;
  if(menu.dataset.key!==formKey){
    menu.dataset.key=formKey;
    menu.innerHTML=Object.entries(DISHES).filter(([id])=>state.stage>1||id==='simple').map(([id,d])=>`<div class="dish-row"><div><label><input type="checkbox" data-dish="${id}" ${state.menu.includes(id)?'checked':''} ${planning?'':'disabled'}><svg class="dish-icon" aria-hidden="true"><use href="assets.svg#${d.icon}"/></svg>${d.name}</label><small>售价 ${Math.round(d.price*state.price)} · 成本 ${d.cost} · ${d.seconds} 秒</small><small>食材库存 ${state.inventory[id]}</small></div><button data-buy="${id}" ${planning?'':'disabled'}>+5 份<br><small>${d.cost*5} 元</small></button></div>`).join('');
  }
  $('#price').disabled=!planning||state.stage===1;$('#price').value=state.price;
  $('#upgrades').innerHTML=Object.entries(UPGRADES).map(([id,u])=>`<div class="upgrade"><strong>${u.name} · ${u.cost}</strong><p>${u.help}</p><button data-upgrade="${id}" ${planning&&state.stage===3&&!state.upgrades[id]&&state.day>=u.day?'':'disabled'}>${state.upgrades[id]?'已购入':`第 ${u.day} 天可购买`}</button></div>`).join('');
  const cooking=state.orders.filter(o=>o.status==='cooking');
  $('#station-count').textContent=state.upgrades.stove?'双工位':'单工位';
  $('#stations').innerHTML=Array.from({length:state.upgrades.stove?2:1},(_,i)=>`<div class="station ${cooking[i]?'working':''}"><svg aria-hidden="true"><use href="assets.svg#stove"/></svg><span>${cooking[i]?`${DISHES[cooking[i].dish].name} · ${cooking[i].remaining} 秒`:'等待订单'}</span></div>`).join('');
  const present=state.orders.filter(o=>!['left','cancelled'].includes(o.status));
  $('#tables').innerHTML=Array.from({length:state.upgrades.seats?6:4},(_,i)=>`<div class="table ${present[i]?'occupied':''}"><svg aria-hidden="true"><use href="assets.svg#${present[i]?'customer':'table'}"/></svg><span>${present[i]?(present[i].status==='eating'?'用餐中':`等餐 ${present[i].wait} 秒`):'空座'}</span></div>`).join('');
  $('#orders').innerHTML=state.orders.filter(o=>['waiting','cooking'].includes(o.status)).map(o=>`<div class="order"><span>#${o.id} ${DISHES[o.dish].name}</span><span>${o.status==='cooking'?'制作中':'排队中'}</span><progress max="45" value="${o.wait}" aria-label="订单 ${o.id} 等待 ${o.wait} 秒"></progress><small>${o.wait}/45 秒</small></div>`).join('')||'<p class="hint">当前没有等待订单。开门后观察顾客、厨房和库存。</p>';
  const settled=['report','complete','bankrupt'].includes(state.phase);
  $('#report').hidden=!settled;
  if(settled){const r=state.report;const losses=Object.entries(r.lost).sort((a,b)=>b[1]-a[1]);const labels={stock:'缺货',wait:'等待超时',seats:'座位不足',price:'价格拒购'};const top=losses[0];
    $('#report').innerHTML=`<h2>${state.phase==='complete'?'七天收获':'今日账本'}</h2><div class="report-grid"><span>收入 <b>${r.revenue}</b></span><span>已售食材 <b>${r.foodCost}</b></span><span>损耗 <b>${r.waste}</b></span><span>固定费用 <b>${r.fixed}</b></span><span>日利润 <b>${r.profit}</b></span><span>现金变化 <b>${r.cashChange}</b></span></div><p>${losses.map(([key,n])=>`${labels[key]} ${n} 人`).join(' · ')}</p><p>${top[1]>0?`下一步线索：主要流失来自${labels[top[0]]}，尝试只改一个安排，再比较。`:'所有到店需求都顺利接待，可以尝试下一步目标。'}</p><p class="hint">采购支出 ${r.purchased}，设备支出 ${r.investment}，库存价值 ${r.inventoryValue}。利润与现金变化不同。</p>${state.phase==='report'?'<button id="next-day">进入下一天 →</button>':`<p>${state.phase==='complete'?'你完成了七天经营。换一个菜单策略，比较第二轮结果。':'现金已为负。查看损失原因，重新规划采购与扩张。'}</p>`}`;
  }
  $('#log').innerHTML=state.log.map(line=>`<li>${escape(line)}</li>`).join('');
  $('#badges').innerHTML=Object.entries(names).map(([id,label])=>`<span class="badge ${state.badges.includes(id)?'earned':''}">${state.badges.includes(id)?'✓':'○'} ${label}</span>`).join('');
  $('#save').disabled=running;$('#load').disabled=running;
}
$('#menu').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b)command(()=>purchase(state,b.dataset.buy));});
$('#menu').addEventListener('change',e=>{if(e.target.matches('[data-dish]')){const ids=[...$('#menu').querySelectorAll('[data-dish]:checked')].map(x=>x.dataset.dish);command(()=>setMenu(state,ids,state.price));delete $('#menu').dataset.key;render();}});
$('#price').addEventListener('change',e=>{command(()=>setMenu(state,state.menu,Number(e.target.value)));delete $('#menu').dataset.key;render();});
$('#upgrades').addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]');if(b)command(()=>buyUpgrade(state,b.dataset.upgrade));});
$('#start').addEventListener('click',()=>{paused=false;accumulator=0;command(()=>startDay(state));});
$('#pause').addEventListener('click',()=>{paused=!paused;render();});
$('#speed').addEventListener('click',()=>{speed=speed===1?4:speed===4?12:1;render();});
$('#report').addEventListener('click',e=>{if(e.target.closest('#next-day')){seenServed=0;command(()=>nextDay(state));}});
$('#save').addEventListener('click',()=>{try{if(['open','closing'].includes(state.phase))throw new Error('请先结束营业');localStorage.setItem(storageKey,JSON.stringify(state));message('进度已保存到本机。');}catch{message('保存失败。请检查浏览器存储权限；当前游戏仍可继续。');}});
$('#load').addEventListener('click',()=>{try{if(['open','closing'].includes(state.phase))return;const raw=localStorage.getItem(storageKey);if(!raw)throw new Error();const restored=restoreGame(raw);if(restored.stage!==state.stage)throw new Error();state=restored;seenServed=state.report.served;delete $('#menu').dataset.key;render();message('进度已恢复。');}catch{message('未找到有效进度；原存档未覆盖。');}});
$('#restart').addEventListener('click',()=>{if(!confirm('重新开始本轮？本机已保存的进度会保留。'))return;state=createGame({stage:state.stage});seenServed=0;paused=false;delete $('#menu').dataset.key;render();message('新一轮开始。');});
$('#audio').addEventListener('click',async()=>{try{audio??=new AudioContext();await audio.resume();audioOn=!audioOn;$('#audio').textContent=audioOn?'关闭声音':'开启声音';tone();}catch{message('此浏览器无法启用声音，画面反馈仍可使用。');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['open','closing'].includes(state.phase)){paused=true;accumulator=0;render();message('离开页面后已暂停，回来时点击继续。');}});
function frame(now){const elapsed=Math.min((now-lastTime)/1000,.25);lastTime=now;
  if(!paused&&['open','closing'].includes(state.phase)&&!document.hidden){accumulator+=elapsed*speed;let changed=false;while(accumulator>=1){advance(state);accumulator--;changed=true;}if(changed){if(state.report.served>seenServed){tone(740,.08);seenServed=state.report.served;}render();}}
  requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
