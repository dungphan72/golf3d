import {ruleQuote,billTotals,type PriceRule,type Service,type Bill} from './pricing.ts';
export type Config={priceRules?:PriceRule[];holidays?:string[];feeMode?:'percent'|'fixed';feeServices?:Service[];pricingRevision?:string;name:string;address:string;open:string;close:string;vat:number|null;fee:number|null;capacity:number|null;vipCapacity:number|null;vipRate:number|null;vipHappy:number|null;rate:number;happy:number;hole9:number[];hole18:number[];vip9:number[];vip18:number[];holeMinutes9:number[];holeMinutes18:number[];buffer:number;clean:number;vipClean:number;days:number;grace:number;cancelHours:number;published:boolean};
export const defaults:Config={name:'Golf3D',address:'250 Lương Đình Của, Phường Bình Trưng, TP.HCM',open:'',close:'',vat:null,fee:null,capacity:null,vipCapacity:null,vipRate:null,vipHappy:null,rate:250000,happy:100000,hole9:[300000,0,0,900000],hole18:[400000,0,0,1000000],vip9:[0,0,0,0],vip18:[0,0,0,0],holeMinutes9:[0,0,0,0],holeMinutes18:[0,0,0,0],buffer:0,clean:5,vipClean:10,days:2,grace:15,cancelHours:2,published:false};
export const rooms=Array.from({length:12},(_,i)=>({id:i<10?`line-${i+1}`:`vip-${i-9}`,name:i<10?`Line ${String(i+1).padStart(2,'0')}`:`VIP ${String(i-9).padStart(2,'0')}`,vip:i>=10,left:i===9}));
export type Segment={start:number;end:number};
export type Booking={id:string;tenant:string;room:string;customer:string;phone:string;service:string;people:number;start:number;end:number;status:string;segments:string;started:number|null;finished:number|null;amount:number|null;payment:string|null;price:string;created:number};
export const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+' ₫';
export function localParts(ms:number){const d=new Date(ms+7*3600000);return {hour:d.getUTCHours(),minute:d.getUTCMinutes(),day:d.getUTCDay(),date:d.toISOString().slice(0,10)};}
export function quote(segments:Segment[],c:Config,vip=false):Bill{
 if(c.priceRules!==undefined)return ruleQuote(segments,c,vip);
 const lines:{date:string;label:string;minutes:number;rate:number;amount:number}[]=[];
 for(const s of segments){if(s.end<s.start)throw new Error('Thời gian không hợp lệ');let t=s.start;while(t<s.end){const p=localParts(t);const happy=p.day!==0&&p.day!==6&&p.hour>=8&&p.hour<11;const rate=vip?(happy?c.vipHappy:c.vipRate):(happy?c.happy:c.rate);if(rate==null||rate<=0)throw new Error('Chưa cấu hình giá phòng');const boundary=(Math.floor(t/60000)+1)*60000;const end=Math.min(boundary,s.end);const minutes=(end-t)/60000;const label=happy?'Happy Hour':'Giờ tiêu chuẩn';const prev=lines.at(-1);if(prev&&prev.label===label&&prev.rate===rate&&prev.date===p.date){prev.minutes+=minutes;prev.amount+=rate*minutes/60;}else lines.push({date:p.date,label,minutes,rate,amount:rate*minutes/60});t=end;}}
 const subtotal=Math.round(lines.reduce((s,l)=>s+l.amount,0));return {lines,...billTotals(subtotal,c)};
}
export function wholeQuote(base:number,c:Config,service:Service='gdr'){return {lines:[],...billTotals(base,c,service)};}
export function ready(c:Config){return !!c.open&&!!c.close&&c.capacity!=null&&c.capacity>0&&c.vipCapacity!=null&&c.vipCapacity>0&&c.vat!=null&&c.fee!=null;}
