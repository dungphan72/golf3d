'use client';
import { useEffect, useState, useCallback } from 'react';
import qrcode from 'qrcode-generator';
import { Printer, RefreshCw } from 'lucide-react';
import { rooms } from '../../lib/club';

const svgFor = (url: string) => {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
};

type QrItem = {
  room_id: string;
  token: string;
  version: number;
  revoked: boolean;
};

/** One secure QR code per line/room. Guests scan it, land on /call/<token> and ring service. */
export function CallQrSheet({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState('');
  const [qrMap, setQrMap] = useState<Record<string, QrItem>>({});
  const [rotating, setRotating] = useState<string | null>(null);

  const fetchQrs = useCallback(async () => {
    try {
      const res = await fetch('/api/service-call/qr', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as any;
        const list = Array.isArray(data.qrCodes) ? data.qrCodes : Array.isArray(data.qrs) ? data.qrs : [];
        if (data.ok && list.length > 0) {
          const map: Record<string, QrItem> = {};
          for (const item of list) {
            map[item.room_id] = {
              room_id: item.room_id,
              token: item.token_secret || item.token,
              version: item.version,
              revoked: !item.is_active,
            };
          }
          setQrMap(map);
        }
      }
    } catch {
      // Keep state
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchQrs();
  }, [fetchQrs]);

  async function handleRotate(roomId: string) {
    if (!confirm(`Bạn có chắc muốn cấp lại mã QR mới cho Line/Phòng này? Mã QR cũ sẽ hết hiệu lực ngay lập tức.`)) {
      return;
    }
    setRotating(roomId);
    try {
      const res = await fetch('/api/service-call/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate', roomId }),
      });
      if (res.ok) {
        await fetchQrs();
      }
    } finally {
      setRotating(null);
    }
  }

  if (!origin) return null;

  return (
    <div className="qr-sheet">
      <div className="qr-head">
        <div>
          <h3>Mã QR gọi phục vụ trực tuyến tại từng Line / Phòng</h3>
          <p className="form-note">
            In và dán tại mỗi Line/Phòng. Khách quét mã để gọi nhân viên, nước uống hoặc yêu cầu tính tiền.
            Mỗi mã có token bảo mật độc lập và có thể cấp lại bất kỳ lúc nào.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="secondary no-print" onClick={() => fetchQrs()}>
            <RefreshCw size={15} />
            Làm mới
          </button>
          <button type="button" className="primary no-print" onClick={() => window.print()}>
            <Printer size={16} />
            In tất cả mã
          </button>
        </div>
      </div>
      <div className="qr-grid">
        {rooms.map((r) => {
          const qrInfo = qrMap[r.id];
          const token = qrInfo?.token;
          const url = token ? `${origin}/call/${token}` : `${origin}/goi/${slug}/${r.id}`;
          return (
            <figure key={r.id} style={{ position: 'relative' }}>
              <div className="qr-img" dangerouslySetInnerHTML={{ __html: svgFor(url) }} />
              <figcaption>
                <strong>{r.vip ? `Phòng ${r.name}` : r.name}</strong>
                <span>Quét mã gọi phục vụ</span>
                {qrInfo?.version && qrInfo.version > 1 && (
                  <small style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>
                    Phiên bản v{qrInfo.version}
                  </small>
                )}
              </figcaption>
              <div className="no-print" style={{ marginTop: 6, textAlign: 'center' }}>
                <button
                  type="button"
                  disabled={rotating === r.id}
                  onClick={() => handleRotate(r.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Cấp lại token QR mới khi mã cũ bị lộ"
                >
                  <RefreshCw size={12} className={rotating === r.id ? 'spin' : ''} />
                  Cấp lại mã
                </button>
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
