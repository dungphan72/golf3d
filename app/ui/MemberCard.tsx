'use client';
import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Check, Copy, Crown, Gem, Star, UserRound, QrCode, X, Sparkles, ShieldCheck } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { TIER_LABEL, type Tier } from '../../lib/member-card';

const ICON = { diamond: Gem, platinum: Crown, gold: Crown, member: Star, guest: UserRound } as const;

const day = (ms: number) =>
  new Date(ms).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

/** The digital card: tier, name, member code and a QR the counter scans to open this member. */
export function MemberCard({
  name,
  code,
  tier,
  since,
  points,
  expires,
  club,
}: {
  name: string;
  code: string;
  tier: Tier;
  since: number | null;
  points: number;
  expires: number | null;
  club: string;
}) {
  const [qr, setQr] = useState('');
  const [largeQr, setLargeQr] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Small card QR
    const q = qrcode(0, 'M');
    q.addData(`${window.location.origin}/quan-ly?hv=${code}`);
    q.make();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value or load-on-open; runs once per dependency change
    setQr(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));

    // Large high-contrast QR for counter scanner
    const qLarge = qrcode(0, 'H');
    qLarge.addData(`${window.location.origin}/quan-ly?hv=${code}`);
    qLarge.make();
    setLargeQr(qLarge.createSvgTag({ cellSize: 8, margin: 2, scalable: true }));
  }, [code]);

  const Icon = ICON[tier] || Star;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code stays selectable on screen */
    }
  }

  return (
    <>
      <section className={'mc mc-' + tier} aria-label="Thẻ hội viên điện tử">
        <div className="mc-top">
          <span className="mc-club">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={32} height={32} />
            <span>{club || BRAND.name}</span>
          </span>
          <span className="mc-tier">
            <Icon size={15} aria-hidden /> {TIER_LABEL[tier] || 'Hội viên'}
          </span>
        </div>

        {/* Dedicated Chip EMV & Contactless Row (never overlaps text) */}
        <div className="mc-chip-row" aria-hidden="true">
          <div className="mc-chip-emv">
            <div className="mc-chip-line"></div>
            <div className="mc-chip-line"></div>
          </div>
          <svg
            className="mc-contactless-wave"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M8.5 16.5a5 5 0 0 1 0-7" opacity="0.6" />
            <path d="M12 19.5a8.5 8.5 0 0 0 0-13" opacity="0.8" />
            <path d="M15.5 22.5a12 12 0 0 0 0-19" />
          </svg>
        </div>

        <div className="mc-body">
          <div className="mc-id">
            <span className="mc-sub-title">HỘI VIÊN ĐẲNG CẤP</span>
            <strong className="mc-name" title={name}>{name}</strong>
            <button
              type="button"
              className="mc-code"
              onClick={copy}
              aria-label={`Sao chép mã ${code}`}
              title="Bấm để sao chép mã hội viên"
            >
              <span>{code}</span>
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            </button>
          </div>

          {qr && (
            <div
              className="mc-qr"
              role="button"
              tabIndex={0}
              onClick={() => setShowQrModal(true)}
              onKeyDown={(e) => e.key === 'Enter' && setShowQrModal(true)}
              title="Chạm để phóng to mã QR check-in tại quầy"
              aria-label="Mã QR của thẻ hội viên. Chạm để phóng to"
            >
              <div className="mc-qr-inner" dangerouslySetInnerHTML={{ __html: qr }} />
              <span className="mc-qr-tap">
                <QrCode size={11} />
                <span>Phóng to</span>
              </span>
            </div>
          )}
        </div>

        <dl className="mc-foot">
          <div>
            <dt>Điểm thưởng</dt>
            <dd>{points} pts</dd>
          </div>
          <div>
            <dt>Hạn thẻ</dt>
            <dd>{expires ? day(expires) : 'Dài hạn'}</dd>
          </div>
          <div>
            <dt>Gia nhập</dt>
            <dd>{since ? day(since) : 'Mới'}</dd>
          </div>
        </dl>

        <div className="mc-bottom-hint">
          <ShieldCheck size={14} />
          <span>Quét mã tại quầy để check-in & tích điểm</span>
        </div>
      </section>

      {/* Fullscreen QR Lightbox Modal for reception check-in */}
      {showQrModal && (
        <div className="mc-modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="mc-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mc-modal-close"
              onClick={() => setShowQrModal(false)}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
            <div className="mc-modal-header">
              <div className="mc-modal-badge">
                <Sparkles size={14} />
                <span>Check-in Lễ Tân</span>
              </div>
              <h3>Mã QR Check-in Quầy</h3>
              <p>Đưa mã này vào máy quét tại quầy lễ tân SaiGon Indoor Golf Club</p>
            </div>

            <div
              className="mc-modal-qr"
              dangerouslySetInnerHTML={{ __html: largeQr }}
            />

            <div className="mc-modal-info">
              <strong>{name}</strong>
              <div className="mc-modal-code">
                <span>Mã số: {code}</span>
                <button type="button" onClick={copy} className="mc-modal-copy">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
