'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { type Lead, type Avail, call, toMs } from './shared';

export function Consult({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const [service, setService] = useState<'gdr' | '9' | '18'>(
    lead.need === '9' ? '9' : lead.need === '18' ? '18' : lead.need === 'swing' ? 'gdr' : '18',
  );
  const [start, setStart] = useState('');
  const [guests, setGuests] = useState(String(lead.guests || 1));
  const [vip, setVip] = useState(false);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [sent, setSent] = useState<{ url: string; manual: boolean } | null>(null);
  const [error, setError] = useState('');
  const body = () => ({ service, start: toMs(start), guests: Number(guests) || 1, vip });
  async function check(at?: number) {
    setError('');
    setSent(null);
    try {
      const b = body();
      setAvail(
        (await call('/api/crm/availability', at ? { ...b, start: at } : b)) as unknown as Avail,
      );
    } catch (e) {
      setAvail(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="crm-consult">
      <div className="crm-actions">
        <select
          aria-label="Dịch vụ"
          value={service}
          onChange={(e) => setService(e.target.value as typeof service)}
        >
          <option value="gdr">Luyện tập (swing)</option>
          <option value="9">Game 9 hố</option>
          <option value="18">Game 18 hố</option>
        </select>
        <input
          aria-label="Giờ chơi"
          type="datetime-local"
          step={900}
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          aria-label="Số khách"
          type="number"
          min={1}
          max={1000}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          style={{ minWidth: '6rem', flex: 0 }}
        />
        <label className="check">
          <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} /> Phòng
          VIP
        </label>
        <button className="secondary" disabled={!start} onClick={() => check()}>
          Kiểm tra lịch trống và báo giá
        </button>
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {avail && (
        <div className="crm-avail" role="status">
          <p>
            {avail.enough ? (
              <>
                <strong>Còn {avail.freeRooms.length} phòng trống</strong>
                {avail.lines > 1 && ` (cần ${avail.lines} line)`}:{' '}
                {avail.freeRooms.map((r) => r.name).join(', ')}
              </>
            ) : (
              <strong>Không đủ phòng trống ở giờ này (cần {avail.lines} line)</strong>
            )}
          </p>
          <p>
            Tạm tính: <strong>{avail.totalText}</strong> · {avail.note}
          </p>
          {avail.alternatives.length > 0 && (
            <p>
              Giờ gần đó còn trống:{' '}
              {avail.alternatives.map((a) => (
                <button
                  key={a.start}
                  className="secondary"
                  onClick={() => {
                    const d = new Date(a.start + 7 * 3_600_000).toISOString().slice(0, 16);
                    setStart(d);
                    check(a.start);
                  }}
                >
                  {a.label}
                </button>
              ))}
            </p>
          )}
          {avail.enough && (
            <button
              className="primary"
              onClick={async () => {
                setError('');
                try {
                  const v = (await call('/api/crm/leads', {
                    action: 'send-link',
                    id: lead.id,
                    ...body(),
                  })) as { url: string; manual: boolean };
                  setSent(v);
                  onDone();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Gửi link đặt lịch cho khách
            </button>
          )}
        </div>
      )}
      {sent && (
        <div className="crm-avail" role="status">
          <p>
            {sent.manual
              ? 'Khách chưa có email hoặc Zalo trong hồ sơ: hãy gửi link này cho khách bằng tay (tin nhắn, Zalo cá nhân).'
              : 'Đã đưa link vào hàng gửi tin cho khách (gửi ngay khi kênh email/Zalo đã cấu hình).'}
          </p>
          <p className="crm-url">{sent.url}</p>
          <button className="secondary" onClick={() => navigator.clipboard?.writeText(sent.url)}>
            <Copy size={14} /> Sao chép link
          </button>
        </div>
      )}
    </div>
  );
}
