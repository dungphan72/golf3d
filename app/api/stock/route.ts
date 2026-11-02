import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {stockInput,movementSignature} from '../../../lib/stock';
export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(){const user=await getChatGPTUser();if(!user)return reply({error:'Vui lòng đăng nhập'},401);try{const db=env.DB!;const items=(await db.prepare('SELECT *,on_hand-reserved AS available FROM stock_status WHERE tenant=? ORDER BY name LIMIT 500').bind(user.userId).all()).results;const movements=(await db.prepare('SELECT * FROM stock_movements WHERE tenant=? ORDER BY created DESC,id DESC LIMIT 100').bind(user.userId).all()).results;return reply({items,movements});}catch(e){console.error('stock load',e);return reply({error:'Chưa tải được kho. Kiểm tra migration.'},503);}}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Vui lòng đăng nhập'},401);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Nguồn yêu cầu không hợp lệ'},403);
 let input;try{const raw=await req.text();if(raw.length>4000)return reply({error:'Yêu cầu quá lớn'},413);const parsed=stockInput.safeParse(JSON.parse(raw));if(!parsed.success)return reply({error:parsed.error.issues.map(i=>i.message).join(' · ')},400);input=parsed.data;}catch{return reply({error:'Dữ liệu không hợp lệ'},400);}
 const tenant=user.userId,db=env.DB!,now=Date.now();
 const replay=async()=>{if(input.action!=='move')return null;const old=await db.prepare('SELECT signature FROM stock_movements WHERE tenant=? AND request_id=?').bind(tenant,input.requestId).first<{signature:string}>();return old?reply(old.signature===movementSignature(input)?{ok:true,replayed:true}:{error:'Mã yêu cầu đã dùng cho thao tác khác'},old.signature===movementSignature(input)?200:409):null;};
 try{
  const previous=await replay();if(previous)return previous;
  if(input.action==='configure'){
   // Configuration is one-way: tracked units keep their ledger for the lifetime of a product.
   const result=await db.prepare('INSERT INTO stock_items(item_id,tenant,low_level,created) SELECT id,tenant,?,? FROM menu_items WHERE id=? AND tenant=? ON CONFLICT(item_id) DO UPDATE SET low_level=excluded.low_level WHERE stock_items.tenant=excluded.tenant').bind(input.lowLevel,now,input.itemId,tenant).run();
   return result.meta.changes?reply({ok:true}):reply({error:'Không tìm thấy món'},404);
  }
  const result=await db.prepare("INSERT INTO stock_movements(id,tenant,item_id,item_name,unit,kind,qty,delta,request_id,signature,order_id,note,actor,created) SELECT ?,m.tenant,m.id,m.name,m.unit,?,?,?,?,?,NULL,?,?,? FROM menu_items m JOIN stock_items s ON s.item_id=m.id AND s.tenant=m.tenant WHERE m.id=? AND m.tenant=?").bind(crypto.randomUUID(),input.kind,input.qty,input.kind==='adjust_out'?-input.qty:input.qty,input.requestId,movementSignature(input),input.note,user.userId,now,input.itemId,tenant).run();
  return result.meta.changes?reply({ok:true}):reply({error:'Hãy bật theo dõi kho cho món trước'},409);
 }catch(e){try{const previous=await replay();if(previous)return previous;}catch{/* original error retained */}const message=String(e);if(message.includes('STOCK_PENDING_ORDERS'))return reply({error:'Hãy phục vụ hoặc hủy hết đơn đang chờ của món trước khi bật kho.'},409);if(message.includes('STOCK_UNAVAILABLE'))return reply({error:'Không đủ hàng khả dụng; không thể xuất phần đã giữ cho đơn đang chờ.'},409);console.error('stock write',e);return reply({error:'Chưa xác minh được kết quả. Tải lại kho trước khi thử tiếp.'},500);}
}
