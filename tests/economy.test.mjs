import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDay } from '../examples/economy.mjs';

test('书中算例区分利润、现金与库存，并满足资产变化关系', () => {
  const result = closeDay({ purchases: { simple: 10, rice: 10, set: 6 }, sold: { simple: 10, rice: 8, set: 4 } });
  assert.equal(result.revenue, 620);
  assert.equal(result.purchaseCost, 320);
  assert.equal(result.foodCost, 256);
  assert.equal(result.profit, 244);
  assert.equal(result.endingCash, 1180);
  assert.equal(result.inventoryValue, 64);
  assert.equal(result.endingCash + result.inventoryValue - 1000, result.profit);
});

test('未售出的采购保留为库存，不重复计入食材成本', () => {
  const result = closeDay({ purchases: { simple: 5 } });
  assert.equal(result.profit, -120);
  assert.equal(result.endingCash, 840);
  assert.equal(result.inventoryValue, 40);
});

test('禁止超售、透支采购与非法数量', () => {
  assert.throws(() => closeDay({ sold: { simple: 1 } }), /库存/);
  assert.throws(() => closeDay({ cash: 39, purchases: { simple: 5 } }), /不足/);
  for (const value of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => closeDay({ purchases: { simple: value } }), /份数/);
  }
  assert.throws(() => closeDay({ purchases: { unknown: 1 } }), /未知/);
});

test('输入对象不会被结算修改，重复计算得出相同结果', () => {
  const input = { purchases: { simple: 3 }, sold: { simple: 2 } };
  const original = structuredClone(input);
  assert.deepEqual(closeDay(input), closeDay(input));
  assert.deepEqual(input, original);
});
