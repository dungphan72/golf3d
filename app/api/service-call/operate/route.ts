import { authorize, sendResult, httpError, sameOrigin } from '../../../auth-session';
import {
  acknowledgeServiceCall,
  startServiceCall,
  completeServiceCall,
  cancelServiceCall,
  createServiceCall,
} from '../../../../lib/server/service-call-service';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return httpError('Nguồn yêu cầu không hợp lệ', 403);
  const { auth, response } = await authorize('support.handle');
  if (response) return response;

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 5000) return httpError('Dữ liệu quá lớn', 413);
    body = JSON.parse(raw);
  } catch {
    return httpError('Dữ liệu không hợp lệ', 400);
  }

  const { action, callId } = body;

  if (action === 'create-proxy') {
    const { roomId, categoryCode, note, customerName, customerPhone } = body;
    if (!roomId || !categoryCode) return httpError('Thiếu thông tin line hoặc loại yêu cầu', 400);
    return sendResult(
      await createServiceCall({
        tenant: auth.tenant,
        roomId,
        categoryCode,
        source: 'staff_proxy',
        customerName: customerName || `Yêu cầu tạo bởi ${auth.name}`,
        customerPhone,
        note,
      })
    );
  }

  if (!callId) return httpError('Thiếu mã yêu cầu', 400);

  if (action === 'acknowledge') {
    return sendResult(await acknowledgeServiceCall(auth.tenant, callId, auth.userId, auth.name));
  }

  if (action === 'start') {
    return sendResult(await startServiceCall(auth.tenant, callId, auth.userId, auth.name));
  }

  if (action === 'complete') {
    const { resolutionType, resolutionNote } = body;
    if (!resolutionType) return httpError('Vui lòng chọn kết quả xử lý', 400);
    return sendResult(
      await completeServiceCall({
        tenant: auth.tenant,
        callId,
        staffId: auth.userId,
        staffName: auth.name,
        resolutionType,
        resolutionNote,
      })
    );
  }

  if (action === 'cancel') {
    const { reason } = body;
    return sendResult(
      await cancelServiceCall({
        tenant: auth.tenant,
        callId,
        actorType: 'staff',
        actorId: auth.userId,
        actorName: auth.name,
        reason: reason || 'Nhân viên hủy yêu cầu',
      })
    );
  }

  return httpError('Hành động không được hỗ trợ', 400);
}
