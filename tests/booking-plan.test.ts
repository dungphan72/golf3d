import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withinOpening,planBooking} from '../lib/booking.ts';
import {defaults,wholeQuote,type Config} from '../lib/club.ts';
import {packagePrice,seedPriceRules,upgradeConfig,validateRules,type PriceRule} from '../lib/pricing.ts';
import {configSchema} from '../lib/config.ts';
const at=(s:string)=>Date.parse(s+'+07:00');
const c:Config={...defaults,open:'08:00',close:'23:00',capacity:4,vipCapacity:4,vat:10,fee:5,priceRules:seedPriceRules(defaults,true),holidays:[],holeMinutes9:[60,90,120,150],holeMinutes18:[120,150,180,240],pricingRevision:'revision-1'};
const now=at('2026-11-02T08:00:00');
test('9-hole weekday quote is locked to booked start, not end',()=>{
 const input={room:'line-1',service:'9' as const,start:at('2026-11-02T10:30:00'),people:1,minutes:60};
 const plan=planBooking(input,c,now);assert.equal(plan.base,300000);assert.equal(plan.bill.total,346500);
 assert.equal(packagePrice(at('2026-11-02T11:00:00'),c,'9',false,1).base,500000);
});
test('18-hole weekend price is different from weekday happy hour',()=>{
 assert.equal(packagePrice(at('2026-11-07T09:00:00'),c,'18',false,1).base,650000);
 assert.equal(packagePrice(at('2026-11-02T09:00:00'),c,'18',false,1).base,400000);
});
test('unconfirmed group price is blocked rather than inferred',()=>assert.throws(()=>planBooking({room:'line-1',service:'9',start:at('2026-11-02T10:00:00'),people:4,minutes:60},c,now),/Chưa có giá/));
test('reserved time includes group allowance, buffer and cleaning separately',()=>{
 const start=at('2026-11-02T10:00:00'),plan=planBooking({room:'line-1',service:'9',start,people:1,minutes:60},{...c,buffer:15,clean:5},now);
 assert.equal(plan.end-start,75*60000);assert.equal(plan.reservedUntil-plan.end,5*60000);
});
test('changing current rates does not change a previous snapshot',()=>{
 const snapshot=JSON.parse(JSON.stringify(c)) as Config;const booked=packagePrice(at('2026-11-02T10:00:00'),snapshot,'9',false,1);
 const current={...c,priceRules:c.priceRules!.map(r=>({...r,amount:r.amount+100000}))};
 assert.equal(packagePrice(at('2026-11-02T10:00:00'),current,'9',false,1).base,400000);assert.equal(booked.base,300000);
});
test('opening check accepts midnight crossover for overnight opening',()=>assert.equal(withinOpening(at('2026-11-02T23:30:00'),at('2026-11-03T01:00:00'),'20:00','02:00'),true));
test('opening check rejects daytime gap for overnight facility',()=>assert.equal(withinOpening(at('2026-11-02T15:00:00'),at('2026-11-02T16:00:00'),'20:00','02:00'),false));
test('closing check rejects a multi-day session with same clock end',()=>assert.equal(withinOpening(at('2026-11-02T10:00:00'),at('2026-11-03T11:00:00'),'08:00','23:00'),false));
test('equal opening/closing permits 24-hour facility and cross-midnight play',()=>assert.equal(withinOpening(at('2026-11-02T23:00:00'),at('2026-11-03T01:00:00'),'00:00','00:00'),true));
test('GDR rejects non-30 minute duration increments',()=>assert.throws(()=>planBooking({room:'line-1',service:'gdr',start:at('2026-11-02T10:00:00'),people:1,minutes:70},c,now),/mỗi 30/));
test('package fee respects service scope',()=>assert.equal(wholeQuote(400000,{...c,feeMode:'fixed',fee:20000,feeServices:['gdr']},'18').fee,0));
test('invalid holiday calendar dates rejected',()=>assert.equal(configSchema.safeParse({...c,holidays:['2026-02-31']}).success,false));
test('schema rejects percentage over 100 but accepts integer fixed amount',()=>{
 assert.equal(configSchema.safeParse({...c,fee:20000,feeMode:'percent'}).success,false);
 assert.equal(configSchema.safeParse({...c,fee:20000,feeMode:'fixed'}).success,true);
});
test('schema rejects duplicate enabled time windows',()=>assert.equal(configSchema.safeParse({...c,priceRules:[c.priceRules![0],{...c.priceRules![0],id:'other'}]}).success,false));
test('disabled rules do not shadow an enabled price',()=>assert.doesNotThrow(()=>validateRules([c.priceRules![0],{...c.priceRules![0],id:'disabled',enabled:false}])));
test('legacy config upgraded without discarding configured VIP price',()=>{
 const old={...defaults,vipRate:450000,vipHappy:200000};const upgraded=upgradeConfig(old,defaults);
 assert.equal(upgraded.priceRules?.find(r=>r.room==='vip'&&r.service==='gdr'&&r.label==='Giờ tiêu chuẩn')?.amount,450000);
});
test('explicit empty rules remain empty on upgrade',()=>assert.deepEqual(upgradeConfig({...defaults,priceRules:[]},defaults).priceRules,[]));
