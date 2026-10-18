// 教学记账模型：不模拟客流、排队、报废或折旧。
import { pathToFileURL } from 'node:url';

export const menu = Object.freeze({
  simple: Object.freeze({ name: '简餐', price: 20, cost: 8, seconds: 10 }),
  rice: Object.freeze({ name: '盖饭', price: 30, cost: 12, seconds: 18 }),
  set: Object.freeze({ name: '招牌套餐', price: 45, cost: 20, seconds: 30 })
});

export function closeDay({ cash = 1000, fixedCost = 120, purchases = {}, sold = {} } = {}) {
  for (const amount of [cash, fixedCost]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('金额必须是非负安全整数');
  }
  for (const quantities of [purchases, sold]) {
    if (!quantities || typeof quantities !== 'object' || Array.isArray(quantities)) throw new Error('数量必须为对象');
    for (const [id, value] of Object.entries(quantities)) {
      if (!Object.hasOwn(menu, id)) throw new Error(`未知菜品：${id}`);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('份数必须是非负安全整数');
    }
  }
  let purchaseCost = 0, revenue = 0, foodCost = 0, inventoryValue = 0, kitchenSeconds = 0;
  const inventory = {};
  for (const [id, item] of Object.entries(menu)) {
    const bought = purchases[id] ?? 0, count = sold[id] ?? 0;
    if (count > bought) throw new Error(`${item.name}销量超过可用库存`);
    purchaseCost += bought * item.cost;
    revenue += count * item.price;
    foodCost += count * item.cost;
    kitchenSeconds += count * item.seconds;
    inventory[id] = bought - count;
    inventoryValue += inventory[id] * item.cost;
  }
  if (purchaseCost > cash) throw new Error('采购现金不足');
  const profit = revenue - foodCost - fixedCost;
  const endingCash = cash - purchaseCost + revenue - fixedCost;
  const numbers = [purchaseCost, revenue, foodCost, inventoryValue, kitchenSeconds, profit, endingCash];
  if (!numbers.every(Number.isSafeInteger)) throw new Error('计算结果超出安全整数范围');
  return { revenue, purchaseCost, foodCost, fixedCost, profit, endingCash, inventoryValue, inventory, kitchenSeconds };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(closeDay({
    purchases: { simple: 10, rice: 10, set: 6 },
    sold: { simple: 10, rice: 8, set: 4 }
  }), null, 2));
}
