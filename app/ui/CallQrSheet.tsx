'use client';
import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Printer } from 'lucide-react';
import { rooms } from '../../lib/club';

const svgFor = (url: string) => {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
};

/** One QR code per line. Guests scan it, land on /goi/<slug>/<line> and ring the service bell. */
export function CallQrSheet({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- origin is only known in the browser
    setOrigin(window.location.origin);
  }, []);
  if (!origin) return null;
  return (
    <div className="qr-sheet">
      <div className="qr-head">
        <div>
          <h3>Mã QR gọi phục vụ tại từng line</h3>
          <p className="form-note">
            In và dán tại mỗi line. Khách quét mã để gọi nhân viên, đồ uống hoặc tính tiền. Chỉ gọi
            được khi line đang có phiên chơi.
          </p>
        </div>
        <button type="button" className="secondary no-print" onClick={() => window.print()}>
          <Printer size={16} />
          In tất cả mã
        </button>
      </div>
      <div className="qr-grid">
        {rooms.map((r) => {
          const url = `${origin}/goi/${slug}/${r.id}`;
          return (
            <figure key={r.id}>
              <div className="qr-img" dangerouslySetInnerHTML={{ __html: svgFor(url) }} />
              <figcaption>
                <strong>{r.name}</strong>
                <span>Quét để gọi phục vụ</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
