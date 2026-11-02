import {z} from 'zod';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import {defaults,quote,wholeQuote, type Config, type Booking, type Segment} from '../../../lib/club';
import {upgradeConfig} from '../../../lib/pricing';
import {configSchema} from '../../../lib/config';
import {planBooking} from '../../../lib/booking';
import {FINISH_SESSION_SQL} from '../../../lib/fnb-sql';
export const dynamic='force-dynamic';
function db(){if(!env.DB)throw new Error('Cơ sở dữ liệu chưa kết nối');return env.DB;}
function fail(message:string,status=400){return Response.json({error:message},{status});}
async function config(tenant:string){const row=await db().prepare('SELECT value FROM settings WHERE tenant=?').bind(tenant).first<{value:string}>();return upgradeConfig(row?JSON.parse(row.value):{},defaults);}
async function log(tenant:string,action:string,detail:string){await db().prepare('INSERT INTO audit VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),tenant,action,detail,Date.now()).run();}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return fail('Vui lòng đăng nhập',401);
 const tenant=user.userId,day=86400000,dayStart=Math.floor((Date.now()+7*3600000)/day)*day-7*3600000;
 const [c,b,r,a,activeShift,receipts]=await Promise.all([
  config(tenant),db().prepare('SELECT * FROM bookings WHERE tenant=? ORDER BY start DESC LIMIT 200').bind(tenant).all(),
  db().prepare('SELECT * FROM requests WHERE tenant=? ORDER BY created DESC LIMIT 100').bind(tenant).all(),
  db().prepare('SELECT * FROM audit WHERE tenant=? ORDER BY created DESC LIMIT 30').bind(tenant).all(),
  db().prepare("SELECT id,name,opened_at FROM shifts WHERE tenant=? AND status='open'").bind(tenant).first(),
  db().prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_entries WHERE tenant=? AND kind='payment' AND created>=? AND created<?").bind(tenant,dayStart,dayStart+day).first<{total:number}>()
 ]);
 return Response.json({config:c,bookings:b.results,requests:r.results,audit:a.results,activeShift,todayReceipts:receipts?.total??0,user:user.displayName,auth:'Sites owner-private',stage:'internal-pilot'},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return fail('Vui lòng đăng nhập',401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return fail('Nguồn yêu cầu không hợp lệ',403);
 const tenant=user.userId;
 const schema=z.object({action:z.enum(['settings','book','request-update','start','pause','resume','finish','pay','cancel','support']),value:z.record(z.unknown()).optional(),id:z.string().max(100).optional(),room:z.string().max(30).optional(),service:z.enum(['gdr','9','18']).optional(),start:z.number().finite().optional(),people:z.number().int().optional(),minutes:z.number().int().optional(),customer:z.string().max(100).optional(),phone:z.string().max(30).optional(),status:z.string().max(30).optional(),kind:z.string().max(100).optional(),method:z.string().max(30).optional(),expectedRevision:z.string().max(100).optional()});
 let input:z.infer<typeof schema>;try{const raw=await req.text();if(raw.length>100000)return fail('Yêu cầu quá lớn',413);input=schema.parse(JSON.parse(raw));}catch{return fail('Dữ liệu không hợp lệ');}
 try{
 const c=await config(tenant);const now=Date.now();
 if(input.action==='settings'){
  if(input.value?.pricingRevision!==c.pricingRevision)return fail('Cấu hình đã thay đổi ở thiết bị khác. Hãy tải lại trước khi lưu.',409);
  const parsed=configSchema.safeParse({...c,...input.value});
  if(!parsed.success)return fail(parsed.error.issues.map(i=>i.message).join(' · '));
  const v:Config={...parsed.data,pricingRevision:crypto.randomUUID(),published:false};
  v.published=false;const saved=await db().prepare("INSERT INTO settings(tenant,value) VALUES (?,?) ON CONFLICT(tenant) DO UPDATE SET value=excluded.value WHERE COALESCE(json_extract(settings.value,'$.pricingRevision'),'v01-upgrade')=?").bind(tenant,JSON.stringify(v),c.pricingRevision).run();if(!saved.meta.changes)return fail('Cấu hình vừa thay đổi; hãy tải lại trước khi lưu.',409);await log(tenant,'Cấu hình','Cập nhật thiết lập cơ sở');return Response.json({ok:true});
 }
 if(input.action==='book'){
  if(input.expectedRevision!==c.pricingRevision)return fail('Bảng giá vừa thay đổi. Hãy tải lại và kiểm tra báo giá mới trước khi xác nhận.',409);
  let plan;
  try {plan=planBooking({room:input.room??'',service:input.service??'gdr',start:Number(input.start),people:Number(input.people),minutes:Number(input.minutes)},c,now);}catch(e){return fail(e instanceof Error?e.message:'Lịch đặt không hợp lệ');}
  const {room,base}=plan;const start=Number(input.start),people=Number(input.people),service=input.service??'gdr';const end=plan.end;
  if(typeof input.customer!=='string'||input.customer.trim().length<2||input.customer.length>100||typeof input.phone!=='string'||!/^\+?[0-9 ()-]{8,20}$/.test(input.phone))return fail('Vui lòng nhập tên và số điện thoại hợp lệ');
  const id=crypto.randomUUID();const clean=(room.vip?c.vipClean:c.clean)*60000;
  const price=JSON.stringify({config:c,base,vip:room.vip,version:2,ruleId:plan.ruleId,ruleLabel:plan.ruleLabel,pricingRevision:c.pricingRevision,estimated:plan.bill});
  const result=await db().prepare("INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,price,created) SELECT ?,?,?,?,?,?,?,?,?,?,'[]',?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status <> 'cancelled' AND start < ? AND end > ?) AND NOT EXISTS (SELECT 1 FROM bookings WHERE tenant=? AND room=? AND status IN ('playing','paused') AND ? < ?)").bind(id,tenant,room.id,input.customer.trim(),input.phone,service,people,start,end+clean,'booked',price,now,tenant,room.id,end+clean,start,tenant,room.id,start,now+clean).run();
  if(!result.meta.changes)return fail('Phòng vừa có lịch trùng hoặc đang sử dụng. Vui lòng chọn giờ/phòng khác.',409);await log(tenant,'Đặt lịch',`${room.name} · ${input.customer}`);return Response.json({ok:true,id});
 }
 if(input.action==='request-update'){if(!['received','done'].includes(input.status??''))return fail('Trạng thái không hợp lệ');await db().prepare('UPDATE requests SET status=? WHERE tenant=? AND id=?').bind(input.status,tenant,input.id).run();return Response.json({ok:true});}
 const b=await db().prepare('SELECT * FROM bookings WHERE tenant=? AND id=?').bind(tenant,input.id).first<Booking>();if(!b)return fail('Không tìm thấy phiên',404);
 const segments:Segment[]=JSON.parse(b.segments);const snap=JSON.parse(b.price);let status=b.status,started=b.started,finished=b.finished,amount=b.amount,payment=b.payment;
 if(input.action==='start'){
  if(status!=='booked')return fail('Chỉ bắt đầu lịch đã đặt');
  if(now<b.start-15*60000)return fail('Chỉ bắt đầu trước lịch hẹn tối đa 15 phút');
  const conflict=await db().prepare("UPDATE bookings SET status='playing',started=? WHERE tenant=? AND id=? AND status='booked' AND NOT EXISTS(SELECT 1 FROM bookings x WHERE x.tenant=? AND x.room=? AND x.id<>? AND (x.status IN ('playing','paused') OR (x.status IN ('finished','paid') AND x.end>?)))").bind(now,tenant,b.id,tenant,b.room,b.id,now).run();
  if(!conflict.meta.changes)return fail('Phòng đang được sử dụng hoặc đang dọn',409);await log(tenant,'Bắt đầu',b.id);return Response.json({ok:true});
 }else if(input.action==='pause'){if(status!=='playing'||started==null)return fail('Phiên chưa chạy');segments.push({start:started,end:now});status='paused';started=null;}
 else if(input.action==='resume'){if(status!=='paused')return fail('Phiên chưa tạm dừng');status='playing';started=now;}
 else if(input.action==='finish'){
  if(!['playing','paused'].includes(status))return fail('Phiên chưa bắt đầu');if(status==='playing'&&started!=null)segments.push({start:started,end:now});
  try{amount=(b.service==='gdr'?quote(segments,snap.config,snap.vip):wholeQuote(snap.base,snap.config,b.service as '9'|'18')).total;}catch{amount=null;}
  const ended=await db().prepare(FINISH_SESSION_SQL).bind(JSON.stringify(segments),now,amount,amount,amount,now+(snap.vip?snap.config.vipClean:snap.config.clean)*60000,tenant,b.id,b.status,b.started).run();
  if(!ended.meta.changes)return fail('Phiên vừa thay đổi ở thiết bị khác. Hãy tải lại.',409);
  await log(tenant,'Kết thúc',b.id);return Response.json({ok:true});
 }else if(input.action==='pay'){return fail('Thanh toán phải được ghi vào sổ ca tại màn hình mới. Hãy tải lại ứng dụng.',409);}
 else if(input.action==='cancel'){if(status!=='booked')return fail('Chỉ hủy lịch chưa bắt đầu');status='cancelled';}
 else if(input.action==='support'){
  if(!['playing','paused'].includes(status))return fail('Chỉ gửi hỗ trợ trong phiên đang sử dụng');if(!['Nhân viên hỗ trợ','Hỗ trợ thiết bị','Yêu cầu khác'].includes(input.kind??''))return fail('Loại yêu cầu không hợp lệ');
  await db().prepare("INSERT INTO requests VALUES (?,?,?,?,'new',?)").bind(crypto.randomUUID(),tenant,b.id,input.kind,now).run();return Response.json({ok:true});
 }else return fail('Thao tác không được hỗ trợ');
 const updated=await db().prepare('UPDATE bookings SET status=?,segments=?,started=?,finished=?,amount=?,payment=?,end=CASE WHEN ? IS NOT NULL THEN ? ELSE end END WHERE tenant=? AND id=? AND status=? AND started IS ?').bind(status,JSON.stringify(segments),started,finished,amount,payment,finished,finished==null?null:finished+(snap.vip?snap.config.vipClean:snap.config.clean)*60000,tenant,b.id,b.status,b.started).run();
 if(!updated.meta.changes)return fail('Phiên đã thay đổi ở thiết bị khác. Hãy tải lại.',409);await log(tenant,input.action,b.id);return Response.json({ok:true});
 }catch(e){console.error(e);return fail(e instanceof Error?e.message:'Không thể xử lý yêu cầu',500);}
}
