'use client';
import { useState, useMemo } from 'react';
import { Calculator, ArrowRight, Check, Sparkles } from 'lucide-react';
import { PriceTable } from '../../lib/price-table';

interface PriceEstimatorProps {
  standardTable: PriceTable;
  vipTable?: PriceTable | null;
  vat?: number | null;
}

export default function PriceEstimator({ standardTable, vipTable, vat }: PriceEstimatorProps) {
  const [service, setService] = useState<'gdr' | 'h9' | 'h18'>('gdr');
  const [isVip, setIsVip] = useState(false);
  const [isGold, setIsGold] = useState(true);
  const [hours, setHours] = useState(1);
  const [people, setPeople] = useState(1);

  // Find price rates
  const table = isVip && vipTable ? vipTable : standardTable;
  const goldRow = table.rows.find(r => r.gold) ?? table.rows[0];
  const standardRow = table.rows.find(r => !r.gold) ?? table.rows[table.rows.length - 1];
  const activeRow = isGold ? goldRow : standardRow;

  const estimate = useMemo(() => {
    let unitPrice = 0;
    let nonGoldUnitPrice = 0;

    if (service === 'gdr') {
      unitPrice = activeRow.gdr ?? 200000;
      nonGoldUnitPrice = standardRow.gdr ?? 250000;
      const subtotal = unitPrice * hours;
      const originalTotal = nonGoldUnitPrice * hours;
      const saved = isGold ? Math.max(0, originalTotal - subtotal) : 0;
      return { total: subtotal, saved, isPerPerson: false };
    } else if (service === 'h9') {
      if (people >= 4 && table.group.h9) {
        return { total: table.group.h9, saved: (activeRow.h9 ?? 250000) * 4 - table.group.h9, isPerPerson: false };
      }
      unitPrice = activeRow.h9 ?? 250000;
      nonGoldUnitPrice = standardRow.h9 ?? 300000;
      const subtotal = unitPrice * people;
      const originalTotal = nonGoldUnitPrice * people;
      const saved = isGold ? Math.max(0, originalTotal - subtotal) : 0;
      return { total: subtotal, saved, isPerPerson: true };
    } else {
      if (people >= 4 && table.group.h18) {
        return { total: table.group.h18, saved: (activeRow.h18 ?? 450000) * 4 - table.group.h18, isPerPerson: false };
      }
      unitPrice = activeRow.h18 ?? 450000;
      nonGoldUnitPrice = standardRow.h18 ?? 550000;
      const subtotal = unitPrice * people;
      const originalTotal = nonGoldUnitPrice * people;
      const saved = isGold ? Math.max(0, originalTotal - subtotal) : 0;
      return { total: subtotal, saved, isPerPerson: true };
    }
  }, [service, activeRow, standardRow, table, hours, people, isGold]);

  const scrollToBook = () => {
    const el = document.getElementById('dat-cho');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fw-estimator" data-sc-in>
      <div className="fw-estimator-card">
        <div className="fw-estimator-head">
          <div className="fw-estimator-title">
            <Calculator size={20} className="text-gold" />
            <div>
              <h3>Công Cụ Dự Tính Chi Phí Nhanh</h3>
              <p>Chọn nhu cầu chơi để xem mức giá tốt nhất và ưu đãi tương ứng</p>
            </div>
          </div>
          {estimate.saved > 0 && (
            <div className="fw-estimator-saving-badge">
              <Sparkles size={14} />
              <span>Tiết kiệm {estimate.saved.toLocaleString('vi-VN')}đ vào Giờ vàng!</span>
            </div>
          )}
        </div>

        <div className="fw-estimator-body">
          {/* Service Row */}
          <div className="fw-estimator-group">
            <label className="fw-group-label">Hình thức trải nghiệm:</label>
            <div className="fw-choice-grid">
              <button
                type="button"
                className={service === 'gdr' ? 'active' : ''}
                onClick={() => setService('gdr')}
              >
                <span>Luyện tập (Driving Range)</span>
                <small>Tính theo giờ / line</small>
              </button>
              <button
                type="button"
                className={service === 'h9' ? 'active' : ''}
                onClick={() => setService('h9')}
              >
                <span>Đấu sân 9 hố</span>
                <small>Tính theo người</small>
              </button>
              <button
                type="button"
                className={service === 'h18' ? 'active' : ''}
                onClick={() => setService('h18')}
              >
                <span>Đấu sân 18 hố</span>
                <small>Trọn vẹn 1 vòng sân</small>
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="fw-estimator-row">
            {/* Room Type */}
            <div className="fw-estimator-col">
              <label className="fw-group-label">Loại phòng:</label>
              <div className="fw-choice-toggle">
                <button
                  type="button"
                  className={!isVip ? 'active' : ''}
                  onClick={() => setIsVip(false)}
                >
                  Line Tiêu chuẩn
                </button>
                <button
                  type="button"
                  className={`vip-btn ${isVip ? 'active' : ''}`}
                  onClick={() => setIsVip(true)}
                >
                  Phòng VIP riêng
                </button>
              </div>
            </div>

            {/* Time slot */}
            <div className="fw-estimator-col">
              <label className="fw-group-label">Khung giờ:</label>
              <div className="fw-choice-toggle">
                <button
                  type="button"
                  className={`gold-btn ${isGold ? 'active' : ''}`}
                  onClick={() => setIsGold(true)}
                >
                  Giờ vàng (Tiết kiệm)
                </button>
                <button
                  type="button"
                  className={!isGold ? 'active' : ''}
                  onClick={() => setIsGold(false)}
                >
                  Giờ tiêu chuẩn
                </button>
              </div>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="fw-estimator-row">
            {service === 'gdr' ? (
              <div className="fw-estimator-col">
                <label className="fw-group-label">Thời gian chơi (giờ):</label>
                <div className="fw-stepper">
                  {[1, 2, 3, 4].map(h => (
                    <button
                      key={h}
                      type="button"
                      className={hours === h ? 'active' : ''}
                      onClick={() => setHours(h)}
                    >
                      {h} giờ
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fw-estimator-col">
                <label className="fw-group-label">Số lượng Golfer tham gia:</label>
                <div className="fw-stepper">
                  {[1, 2, 3, 4].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={people === p ? 'active' : ''}
                      onClick={() => setPeople(p)}
                    >
                      {p} Golfer {p === 4 ? '(Giá nhóm)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foot Result */}
        <div className="fw-estimator-foot">
          <div className="fw-result-price">
            <span className="fw-result-label">Chi phí dự tính:</span>
            <div className="fw-result-num">
              <strong>{estimate.total.toLocaleString('vi-VN')}đ</strong>
              <small>({vat ? `Chưa gồm VAT ${vat}%` : 'Chưa gồm VAT'} · Thanh toán sau khi chơi)</small>
            </div>
          </div>
          <button type="button" className="fw-btn-estimator-action" onClick={scrollToBook}>
            <span>Giữ Phòng Theo Mức Giá Này</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
