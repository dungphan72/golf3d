import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {financeInput,reconciliation,shiftTotals,scopedShiftId,matchesEntry,type Shift,type ShiftSummary,type Entry} from '../../../lib/finance';
import {OPEN_SHIFT_SQL,INSERT_ENTRY_SQL,CLOSE_SHIFT_SQL,SHIFT_SUMMARY_SQL} from '../../../lib/finance-sql';
export const dynamic='force-dynamic';
function database(){if(!env.DB)throw new Error('DB chưa kết nối');return env.DB;}
function error(message:string,status=400){return Response.json({error:message},{status});}
async function summaries(tenant:string){return (await database().prepare(SHIFT_SUMMARY_SQL).bind(tenant).all<ShiftSummary>()).results;}
export async function GET(req:Request){
 const user=await getChatGPTUser();if(!user)return error('Vui lòng đăng nhập',401);
 try{
  const shifts=await summaries(user.userId);const selectedId=new URL(req.url).searchParams.get('shift');
  const selected=selectedId?shifts.find(s=>s.id===selectedId):shifts.find(s=>s.status==='open')??shifts[0];
  if(selectedId&&!selected)return error('Không tìm thấy ca trong 30 ca gần nhất',404);
  const entries=selected?(await database().prepare('SELECT * FROM finance_entries WHERE tenant=? AND shift_id=? ORDER BY created DESC,id DESC LIMIT 101').bind(user.userId,selected.id).all<Entry>()).results:[];
  return Response.json({shifts,selectedId:selected?.id??null,entries:entries.slice(0,100),hasMore:entries.length>100},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Finance load failed',e);return error('Không tải được sổ ca. Kiểm tra database đã áp dụng migration mới.',503);}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return error('Vui lòng đăng nhập',401);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return error('Nguồn yêu cầu không hợp lệ',403);
 let raw:string;try{raw=await req.text();if(raw.length>5000)return error('Yêu cầu quá lớn',413);}catch{return error('Dữ liệu không hợp lệ');}
 let json:unknown;try{json=JSON.parse(raw);}catch{return error('Dữ liệu không hợp lệ');}
 const parsed=financeInput.safeParse(json);if(!parsed.success)return error(parsed.error.issues.map(i=>i.message).join(' · '));
 const input=parsed.data,tenant=user.userId,now=Date.now(),db=database();
 const openingId=input.action==='open'?await scopedShiftId(tenant,input.requestId):null;
 // Replays are scoped to the authenticated tenant and must match the original operation.
 async function replay(){
  if(input.action==='open'){
   const old=await db.prepare('SELECT * FROM shifts WHERE tenant=? AND id=?').bind(tenant,openingId).first<Shift>();
   if(!old)return null;
   return old.name===input.name&&old.opening_cash===input.openingCash?Response.json({ok:true,replayed:true}):error('Mã yêu cầu đã dùng với dữ liệu khác',409);
  }
  if(input.action==='close')return null;
  const old=await db.prepare('SELECT * FROM finance_entries WHERE tenant=? AND request_id=?').bind(tenant,input.requestId).first<Entry>();
  if(!old)return null;
  const matches=matchesEntry(old,input);
  return matches?Response.json({ok:true,replayed:true}):error('Mã yêu cầu đã dùng với dữ liệu khác',409);
 }
 try{
  const previous=await replay();if(previous)return previous;
  if(input.action==='open'){
   await db.prepare(OPEN_SHIFT_SQL).bind(openingId,tenant,input.name,user.userId,now,input.openingCash).run();return Response.json({ok:true});
  }
  if(input.action==='close'){
   const shift=(await summaries(tenant)).find(s=>s.id===input.shiftId);
   if(!shift)return error('Không tìm thấy ca',404);
   if(shift.status==='closed'){
    const same=shift.counted_cash===input.countedCash&&shift.counted_transfer===input.countedTransfer&&shift.counted_card===input.countedCard&&shift.note===input.note&&shift.version===input.expectedVersion+1;
    return same?Response.json({ok:true,replayed:true}):error('Ca đã đóng và không được sửa',409);
   }
   const result=reconciliation(shiftTotals(shift),{cash:input.countedCash,transfer:input.countedTransfer,card:input.countedCard});
   if([result.cashDifference,result.transferDifference,result.cardDifference].some(n=>n!==0)&&input.note.length<5)return error('Cần ghi lý do chênh lệch ít nhất 5 ký tự');
   const updated=await db.prepare(CLOSE_SHIFT_SQL).bind(user.userId,now,input.countedCash,input.countedTransfer,input.countedCard,result.expectedCash,result.expectedTransfer,result.expectedCard,input.note,tenant,shift.id,input.expectedVersion).run();
   if(!updated.meta.changes)return error('Sổ tiền vừa thay đổi. Tải lại và đối soát trước khi đóng ca.',409);
   return Response.json({ok:true});
  }
  if(input.action==='cash-entry'){
   await db.prepare(INSERT_ENTRY_SQL).bind(crypto.randomUUID(),tenant,input.shiftId,input.kind,'cash',input.amount,null,input.requestId,input.note,user.userId,now).run();return Response.json({ok:true});
  }
  const booking=await db.prepare('SELECT id,status,amount FROM bookings WHERE tenant=? AND id=?').bind(tenant,input.bookingId).first<{id:string;status:string;amount:number|null}>();
  if(!booking)return error('Không tìm thấy phiếu',404);
  if(booking.status!=='finished'||booking.amount==null||booking.amount<=0)return error('Chỉ thu phiếu đã kết thúc, có số tiền hợp lệ và chưa thanh toán',409);
  const shift=await db.prepare("SELECT id FROM shifts WHERE tenant=? AND status='open'").bind(tenant).first<{id:string}>();
  if(!shift)return error('Hãy mở ca trước khi xác nhận thu tiền',409);
  await db.prepare(INSERT_ENTRY_SQL).bind(crypto.randomUUID(),tenant,shift.id,'payment',input.method,booking.amount,booking.id,input.requestId,'Thanh toán phiếu '+booking.id,user.userId,now).run();
  return Response.json({ok:true});
 }catch(e){
  // A parallel identical request may have committed after replay() first checked.
  try{const previous=await replay();if(previous)return previous;}catch{/* Preserve the original storage failure below. */}
  const message=e instanceof Error?e.message:String(e);
  if(message.includes('INSUFFICIENT_CASH'))return error('Số tiền chi vượt tiền mặt dự kiến trong quỹ',409);
  if(message.includes('SHIFT_NOT_OPEN'))return error('Ca đã đóng hoặc không thuộc cơ sở. Tải lại trước khi thao tác.',409);
  if((message.includes('one_open_shift_per_tenant')||message.includes('shifts.tenant')))return error('Đã có ca đang mở. Hãy đóng ca trước khi mở ca mới.',409);
  if(message.includes('BOOKING_NOT_PAYABLE')||message.includes('booking_paid_once')||message.includes('finance_entries.booking_id'))return error('Phiếu đã được thanh toán hoặc vừa thay đổi ở thiết bị khác',409);
  if(message.includes('RECONCILIATION_CHANGED'))return error('Số tiền đã thay đổi. Tải lại và đối soát lại.',409);
  console.error('Finance operation failed',e);return error('Chưa xác minh được kết quả ghi sổ. Hãy tải lại để kiểm tra trước khi thử tiếp.',500);
 }
}
