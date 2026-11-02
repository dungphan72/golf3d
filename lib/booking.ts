import {rooms,ready,quote,wholeQuote,type Config} from './club.ts';
import {clockMinute,packagePrice,type Service} from './pricing.ts';
export type BookingInput={room:string;service:Service;start:number;people:number;minutes:number};
export function withinOpening(start:number,end:number,open:string,close:string){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return false;
 const from=clockMinute(open),until=clockMinute(close);
 const d=new Date(start+7*3600000),m=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60+d.getUTCMilliseconds()/60000;
 const duration=(end-start)/60000;
 // Equal opening/closing denotes a continuous 24-hour facility.
 if(from===until)return duration<=1440;
 if(until>from)return m>=from&&m+duration<=until;
 const position=m<until?m+1440:m;
 return position>=from&&position+duration<=until+1440;
}
export function planBooking(input:BookingInput,c:Config,now:number){
 if(!ready(c))throw new Error('Hãy cấu hình giờ mở cửa, sức chứa, VAT và phí dịch vụ trước khi đặt thử.');
 const room=rooms.find(r=>r.id===input.room);if(!room)throw new Error('Phòng không hợp lệ');
 const {start,people,minutes,service}=input;
 if(!['gdr','9','18'].includes(service)||!Number.isInteger(people)||people<1||people>Math.min(4,(room.vip?c.vipCapacity:c.capacity)!))throw new Error('Số người hoặc dịch vụ không hợp lệ');
 if(!Number.isSafeInteger(start)||start<now||start>now+90*86400000||start%900000!==0)throw new Error('Giờ bắt đầu phải ở tương lai, cách nhau 15 phút và không quá 90 ngày cho nhân viên.');
 let end:number,base=0,ruleId:string|null=null,ruleLabel:string|null=null;
 if(service==='gdr'){
  if(!Number.isInteger(minutes)||minutes<60||minutes>720||(minutes-60)%30!==0)throw new Error('GDR tối thiểu 60 phút, tăng mỗi 30 phút.');
  end=start+minutes*60000;
 }else {
  const price=packagePrice(start,c,service,room.vip,people);base=price.base;ruleId=price.ruleId;ruleLabel=price.label;
  const time=(service==='9'?c.holeMinutes9:c.holeMinutes18)[people-1];if(!time)throw new Error('Chưa cấu hình thời lượng giữ phòng cho nhóm khách này.');
  end=start+(time+c.buffer)*60000;
 }
 if(!withinOpening(start,end,c.open,c.close))throw new Error('Lượt chơi nằm ngoài giờ hoạt động.');
 const bill=service==='gdr'?quote([{start,end}],c,room.vip):wholeQuote(base,c,service);
 return {room,base,end,reservedUntil:end+(room.vip?c.vipClean:c.clean)*60000,bill,ruleId,ruleLabel};
}
