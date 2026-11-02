import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stockInput,availableStock,movementSignature} from '../lib/stock.ts';
const requestId='stock-request-123456';
test('available stock excludes units reserved for pending orders',()=>assert.equal(availableStock(20,7),13));
test('stock cannot have negative or fractional balances',()=>{assert.throws(()=>availableStock(1,2));assert.throws(()=>availableStock(1.5,0));});
test('manual movements require positive integer units and a reason',()=>{
 const input={action:'move',requestId,itemId:'p1',kind:'receipt',qty:5,note:'Nhập hàng mới'};
 assert.equal(stockInput.safeParse(input).success,true);
 for(const qty of [0,-1,1.5])assert.equal(stockInput.safeParse({...input,qty}).success,false);
 assert.equal(stockInput.safeParse({...input,note:''}).success,false);
});
test('clients cannot set balances or generate internal reservation movements',()=>{
 assert.equal(stockInput.safeParse({action:'move',requestId,itemId:'p1',kind:'reserve',qty:1,note:'Hàng mới'}).success,false);
 assert.equal(stockInput.safeParse({action:'move',requestId,itemId:'p1',kind:'receipt',qty:1,note:'Hàng mới',onHand:100}).success,false);
});
test('retry signature changes when quantity or intent changes',()=>{
 const a={itemId:'p1',kind:'receipt',qty:5,note:'Nhập hàng'};
 assert.equal(movementSignature(a),movementSignature({...a}));assert.notEqual(movementSignature(a),movementSignature({...a,qty:6}));assert.notEqual(movementSignature(a),movementSignature({...a,kind:'adjust_in'}));
});
