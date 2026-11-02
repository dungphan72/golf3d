import {test} from 'node:test';
import assert from 'node:assert/strict';
import {financeInput,reconciliation} from '../lib/finance.ts';
const key='operation-key-1234567890';
test('opening cash must be whole non-negative VND',()=>{
 assert.equal(financeInput.safeParse({action:'open',requestId:key,openingCash:0,name:'Ca sáng'}).success,true);
 for(const openingCash of [-1,1.5,Infinity])assert.equal(financeInput.safeParse({action:'open',requestId:key,openingCash,name:'Ca sáng'}).success,false);
});
test('manual cash movement needs a positive amount and reason',()=>{
 assert.equal(financeInput.safeParse({action:'cash-entry',requestId:key,shiftId:'s1',kind:'cash_out',amount:0,note:'Mua nước'}).success,false);
 assert.equal(financeInput.safeParse({action:'cash-entry',requestId:key,shiftId:'s1',kind:'cash_out',amount:100000,note:''}).success,false);
 assert.equal(financeInput.safeParse({action:'cash-entry',requestId:key,shiftId:'s1',kind:'cash_out',amount:100000,note:'Mua nước'}).success,true);
});
test('client cannot choose a tenant or submit a payment total',()=>{
 assert.equal(financeInput.safeParse({action:'pay',requestId:key,bookingId:'b1',method:'cash',expectedAmount:100000,amount:1}).success,false);
 assert.equal(financeInput.safeParse({action:'open',requestId:key,openingCash:0,name:'Ca sáng',tenant:'other'}).success,false);
});
test('cash reconciliation separates opening float, receipts and expenses',()=>{
 const result=reconciliation({openingCash:500000,cashReceived:800000,transferReceived:600000,cardReceived:400000,cashIn:200000,cashOut:150000},{cash:1300000,transfer:600000,card:390000});
 assert.equal(result.expectedCash,1350000);assert.equal(result.cashDifference,-50000);assert.equal(result.cardDifference,-10000);assert.equal(result.transferDifference,0);assert.equal(result.receipts,1800000);
});
test('closing cash must not be negative or fractional',()=>{
 assert.equal(financeInput.safeParse({action:'close',shiftId:'s1',expectedVersion:0,countedCash:-1,countedTransfer:0,countedCard:0,note:''}).success,false);
});
test('unknown payment methods and missing retry keys are rejected',()=>{
 assert.equal(financeInput.safeParse({action:'pay',requestId:key,bookingId:'b1',method:'wallet'}).success,false);
 assert.equal(financeInput.safeParse({action:'pay',bookingId:'b1',method:'cash'}).success,false);
});
test('open shift retry identifiers are deterministic and tenant scoped',async()=>{
 const {scopedShiftId}=await import('../lib/finance.ts');
 const a=await scopedShiftId('tenant-a',key),again=await scopedShiftId('tenant-a',key),b=await scopedShiftId('tenant-b',key);
 assert.equal(a,again);assert.notEqual(a,b);assert.equal(a.length,64);
});
test('a retry with a different payment method is not treated as success',async()=>{
 const {matchesEntry}=await import('../lib/finance.ts');
 const old={id:'e',tenant:'t',shift_id:'s',kind:'payment' as const,method:'cash' as const,amount:100000,booking_id:'b1',request_id:key,note:'Paid',actor:'u',created:1};
 assert.equal(matchesEntry(old,{action:'pay',requestId:key,bookingId:'b1',method:'cash',expectedAmount:100000}),true);
 assert.equal(matchesEntry(old,{action:'pay',requestId:key,bookingId:'b1',method:'transfer',expectedAmount:100000}),false);
 assert.equal(matchesEntry(old,{action:'pay',requestId:key,bookingId:'b2',method:'cash',expectedAmount:100000}),false);
});
test('zero receipts do not include money deposited into the cash drawer',()=>{
 const r=reconciliation({openingCash:100000,cashReceived:0,transferReceived:0,cardReceived:0,cashIn:500000,cashOut:200000},{cash:400000,transfer:0,card:0});
 assert.equal(r.receipts,0);assert.equal(r.expectedCash,400000);assert.equal(r.cashDifference,0);
});
test('unsafe financial aggregates and negative counted values are rejected',()=>{
 assert.throws(()=>reconciliation({openingCash:Number.MAX_SAFE_INTEGER,cashReceived:1,transferReceived:0,cardReceived:0,cashIn:0,cashOut:0},{cash:0,transfer:0,card:0}));
 assert.throws(()=>reconciliation({openingCash:0,cashReceived:0,transferReceived:0,cardReceived:0,cashIn:0,cashOut:0},{cash:-1,transfer:0,card:0}));
});
test('payment confirmation requires the amount the cashier actually reviewed',()=>{
 assert.equal(financeInput.safeParse({action:'pay',requestId:key,bookingId:'b1',method:'cash'}).success,false);
 assert.equal(financeInput.safeParse({action:'pay',requestId:key,bookingId:'b1',method:'cash',expectedAmount:100000}).success,true);
});
