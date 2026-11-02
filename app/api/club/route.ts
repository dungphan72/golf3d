import {z} from 'zod';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import {defaults,rooms,quote,wholeQuote,ready, type Config, type Booking, type Segment} from '../../../lib/club';
export const dynamic='force-dynamic';
function db(){if(!env.DB)throw new Error('Cơ sở dữ liệu chưa kết nối');return env.DB;}
function fail(message:string,status=400){return Response.json({error:message},{status});}
async function config(tenant:string){const row=await db().prepare('SELECT value FROM settings WHERE tenant=?').bind(tenant).first<{value:string}>();return row?{...defaults,...JSON.parse(row.value)}:defaults;}
async function log(tenant:string,action:string,detail:string){await db().prepare('INSERT INTO audit VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),tenant,action,detail,Date.now()).run();}
export async function GET(){const user=await getChatGPTUser();if(!user)return fail('Vui lòng đăng nhập',401);const tenant=user.userId;const [c,b,r,a]=await Promise.all([config(tenant),db().prepare('SELECT * FROM bookings WHERE tenant=? ORDER BY start DESC LIMIT 200').bind(tenant).all(),db().prepare('SELECT * FROM requests WHERE tenant=? ORDER BY created DESC LIMIT 100').bind(tenant).all(),db().prepare('SELECT * FROM audit WHERE tenant=? ORDER BY created DESC LIMIT 30').bind(tenant).all()]);return Response.json({config:c,bookings:b.results,requests:r.results,audit:a.results,user:user.displayName,auth:'Sites owner-private',stage:'internal-pilot'},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return fail('Vui lòng đăng nhập',401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return fail('Nguồn yêu cầu không hợp lệ',403);
 const tenant=user.userId;
 const schema=z.object({action:z.enum(['settings','book','request-update','start','pause','resume','finish','pay','cancel','support']),value:z.record(z.unknown()).optional(),id:z.string().max(100).optional(),room:z.string().max(30).optional(),service:z.enum(['gdr','9','18']).optional(),start:z.number().finite().optional(),people:z.number().int().optional(),minutes:z.number().int().optional(),customer:z.string().max(100).optional(),phone:z.string().max(30).optional(),status:z.string().max(30).optional(),kind:z.string().max(100).optional(),method:z.string().max(30).optional()});
 let input:z.infer<typeof schema>;try{const raw=await req.text();if(raw.length>16000)return fail('Yêu cầu quá lớn',413);input=schema.parse(JSON.parse(raw));}catch{return fail('Dữ liệu không hợp lệ');}
 try{
 const c=await config(tenant);const now=Date.now();
 if(input.action==='settings'){
  const v={...c,...input.value} as Config;
  for(const key of ['rate','happy','buffer','clean','vipClean','days','grace','cancelHours'] as const){if(!Number.isFinite(v[key])||v[key]<0||v[key]>10000000)return fail('Giá trị cấu hình không hợp lệ');}
  for(const key of ['vat','fee','capacity','vipCapacity','vipRate','vipHappy'] as const){if(v[key]!==null&&(!Number.isFinite(v[key])||v[key]!<0))return fail('Giá trị cấu hình không hợp lệ');}
  if((v.vat??0)>100||(v.fee??0)>100||(v.capacity??0)>100||(v.vipCapacity??0)>100)return fail('Thuế/phí hoặc sức chứa không hợp lệ');
  if(typeof v.name!=='string'||v.name.length>100||typeof v.address!=='string'||v.address.length>300)return fail('Thông tin cơ sở không hợp lệ');
  for(const key of ['open','close'] as const)if(v[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v[key]))return fail('Giờ hoạt động không hợp lệ');
  for(const key of ['hole9','hole18','vip9','vip18','holeMinutes9','holeMinutes18'] as const)if(!Array.isArray(v[key])||v[key].length!==4||v[key].some(x=>!Number.isFinite(x)||x<0||x>10000000))return fail('Bảng giá/thời lượng không hợp lệ');
  v.published=false;await db().prepare('INSERT INTO settings(tenant,value) VALUES (?,?) ON CONFLICT(tenant) DO UPDATE SET value=excluded.value').bind(tenant,JSON.stringify(v)).run();await log(tenant,'Cấu hình','Cập nhật thiết lập cơ sở');return Response.json({ok:true});
 }
 if(input.action==='book'){
  if(!ready(c))return fail('Hãy cấu hình giờ mở cửa, sức chứa, VAT và phí dịch vụ trước khi đặt thử.');
  const room=rooms.find(r=>r.id===input.room);if(!room)return fail('Phòng không hợp lệ');
  const start=Number(input.start),people=Number(input.people),minutes=Number(input.minutes),service=input.service??'';
  if(!['gdr','9','18'].includes(service)||!Number.isInteger(people)||people<1||people>Math.min(4,(room.vip?c.vipCapacity:c.capacity)!))return fail('Số người hoặc dịch vụ không hợp lệ');
  if(!Number.isFinite(start)||start<now-60000||start>now+90*86400000||new Date(start+7*3600000).getUTCMinutes()%15!==0||start%60000!==0)return fail('Giờ bắt đầu phải ở tương lai, cách nhau 15 phút và không quá 90 ngày cho nhân viên.');
  const p=new Date(start+7*3600000);const hm=p.toISOString().slice(11,16);let end:number;let base=0;
  if(service==='gdr'){if(!Number.isInteger(minutes)||minutes<60||minutes>720||(minutes-60)%30!==0)return fail('GDR tối thiểu 60 phút, tăng mỗi 30 phút.');end=start+minutes*60000;quote([{start,end}],c,room.vip);}
  else {const prices=service==='9'?(room.vip?c.vip9:c.hole9):(room.vip?c.vip18:c.hole18);base=prices[people-1];const time=(service==='9'?c.holeMinutes9:c.holeMinutes18)[people-1];if(!base||!time)return fail('Chưa cấu hình đủ giá và thời lượng cho nhóm khách này.');end=start+(time+c.buffer)*60000;}
  const close=c.close,open=c.open;const duration=(end-start)/60000;const startM=Number(hm.slice(0,2))*60+Number(hm.slice(3));const openM=Number(open.slice(0,2))*60+Number(open.slice(3)),closeM=Number(close.slice(0,2))*60+Number(close.slice(3));const adjustedClose=closeM<=openM?closeM+1440:closeM;const adjustedStart=startM<openM?startM+1440:startM;if(adjustedStart<openM||adjustedStart+duration>adjustedClose)return fail('Lượt chơi nằm ngoài giờ hoạt động.');
  if(typeof input.customer!=='string'||input.customer.trim().length<2||input.customer.length>100||typeof input.phone!=='string'||!/^\+?[0-9 ()-]{8,20}$/.test(input.phone))return fail('Vui lòng nhập tên và số điện thoại hợp lệ');
  const id=crypto.randomUUID();const clean=(room.vip?c.vipClean:c.clean)*60000;
  const price=JSON.stringify({config:c,base,vip:room.vip});
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
  amount=(b.service==='gdr'?quote(segments,snap.config,snap.vip):wholeQuote(snap.base,snap.config)).total;status='finished';finished=now;started=null;
 }else if(input.action==='pay'){if(status!=='finished')return fail('Chỉ thanh toán phiên đã kết thúc');if(!['cash','transfer','card'].includes(input.method??''))return fail('Phương thức không hợp lệ');status='paid';payment=input.method??null;}
 else if(input.action==='cancel'){if(status!=='booked')return fail('Chỉ hủy lịch chưa bắt đầu');status='cancelled';}
 else if(input.action==='support'){
  if(!['playing','paused'].includes(status))return fail('Chỉ gửi hỗ trợ trong phiên đang sử dụng');if(!['Nhân viên hỗ trợ','Hỗ trợ thiết bị','Yêu cầu khác'].includes(input.kind??''))return fail('Loại yêu cầu không hợp lệ');
  await db().prepare("INSERT INTO requests VALUES (?,?,?,?,'new',?)").bind(crypto.randomUUID(),tenant,b.id,input.kind,now).run();return Response.json({ok:true});
 }else return fail('Thao tác không được hỗ trợ');
 const updated=await db().prepare('UPDATE bookings SET status=?,segments=?,started=?,finished=?,amount=?,payment=?,end=CASE WHEN ? IS NOT NULL THEN ? ELSE end END WHERE tenant=? AND id=? AND status=? AND started IS ?').bind(status,JSON.stringify(segments),started,finished,amount,payment,finished,finished==null?null:finished+(snap.vip?snap.config.vipClean:snap.config.clean)*60000,tenant,b.id,b.status,b.started).run();
 if(!updated.meta.changes)return fail('Phiên đã thay đổi ở thiết bị khác. Hãy tải lại.',409);await log(tenant,input.action,b.id);return Response.json({ok:true});
 }catch(e){console.error(e);return fail(e instanceof Error?e.message:'Không thể xử lý yêu cầu',500);}
}
