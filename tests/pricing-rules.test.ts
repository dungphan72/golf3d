import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Config} from '../lib/club.ts';
import type {PriceRule} from '../lib/pricing.ts';
import {defaults,quote} from '../lib/club.ts';
const at=(s:string)=>Date.parse(s+'+07:00');
const rule=(overrides:Partial<PriceRule>={}):PriceRule=>({id:'weekday',label:'Giờ tập',service:'gdr',room:'standard',day:'weekday',from:'00:00',to:'24:00',people:null,amount:300000,enabled:true,...overrides});
const config=(extra:Partial<Config>={}):Config=>({...defaults,vat:0,fee:0,priceRules:[rule()],holidays:[],...extra});
test('explicit hourly rate overrides legacy defaults',()=>{
 const q=quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T13:00:00')}],config());
 assert.equal(q.total,300000);
});
test('holiday rate takes precedence over weekday classification',()=>{
 const c=config({holidays:['2026-11-02'],priceRules:[rule(),rule({id:'holiday',day:'holiday',amount:500000})]});
 assert.equal(quote([{start:at('2026-11-02T09:00:00'),end:at('2026-11-02T10:00:00')}],c).total,500000);
});
test('explicit empty tariff fails closed instead of falling back',()=>{
 assert.throws(()=>quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T13:00:00')}],config({priceRules:[]})),/Chưa có giá/);
});
test('missing price anywhere in session cannot silently produce a bill',()=>{
 assert.throws(()=>quote([{start:at('2026-11-02T10:30:00'),end:at('2026-11-02T11:30:00')}],config({priceRules:[rule({from:'08:00',to:'11:00'})]})),/Chưa có giá/);
});
test('fixed service fee is applied once across pauses',()=>{
 const c=config({fee:20000,feeMode:'fixed'});
 const q=quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T12:30:00')},{start:at('2026-11-02T13:00:00'),end:at('2026-11-02T13:30:00')}],c);
 assert.equal(q.fee,20000);assert.equal(q.total,320000);
});
test('fee can exclude GDR while still applying to other services',()=>{
 const q=quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T13:00:00')}],config({fee:10,feeServices:['9','18']}));
 assert.equal(q.fee,0);
});
test('overlapping matching rules are rejected',()=>{
 assert.throws(()=>quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T13:00:00')}],config({priceRules:[rule(),rule({id:'duplicate'})]})),/trùng/);
});
test('tariff splits exactly at midnight and uses the new calendar day',()=>{
 const c=config({priceRules:[rule({day:'weekday',amount:300000}),rule({id:'sat',day:'weekend',amount:600000})]});
 const q=quote([{start:at('2026-11-06T23:30:00'),end:at('2026-11-07T00:30:00')}],c);
 assert.equal(q.total,450000);assert.equal(q.lines.length,2);
});
test('displayed line amounts always sum to billed VND subtotal',()=>{
 const q=quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T12:00:01')},{start:at('2026-11-02T12:00:02'),end:at('2026-11-02T12:00:03')}],config({priceRules:[rule({amount:100000})]}));
 assert.equal(q.lines.reduce((s,l)=>s+l.amount,0),q.subtotal);assert.equal(q.subtotal,56);
});
test('overlapping intervals cannot double charge a customer',()=>assert.throws(()=>quote([{start:at('2026-11-02T12:00:00'),end:at('2026-11-02T13:00:00')},{start:at('2026-11-02T12:30:00'),end:at('2026-11-02T13:30:00')}],config()),/trùng/));
test('reversed and non-finite times are rejected',()=>{
 assert.throws(()=>quote([{start:100,end:0}],config()),/không hợp lệ/);
 assert.throws(()=>quote([{start:NaN,end:100}],config()),/không hợp lệ/);
});
test('overnight rule covers both sides of midnight',()=>{
 const c=config({priceRules:[rule({from:'22:00',to:'02:00'})]});
 assert.equal(quote([{start:at('2026-11-02T23:30:00'),end:at('2026-11-03T00:30:00')}],c).total,300000);
});
test('month-long upper limit protects a stale session from unbounded billing',()=>assert.throws(()=>quote([{start:at('2026-11-02T12:00:00'),end:at('2026-12-04T12:00:00')}],config()),/31 ngày/));
