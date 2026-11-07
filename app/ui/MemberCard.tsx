'use client';
import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Check, Copy, Crown, Gem, Star, UserRound } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { TIER_LABEL, type Tier } from '../../lib/member-card';

const ICON = { diamond: Gem, platinum: Crown, member: Star, guest: UserRound } as const;

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
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // The QR opens the staff screen on this member; it is only a lookup key, so it is safe to show.
    const q = qrcode(0, 'M');
    q.addData(`${window.location.origin}/quan-ly?hv=${code}`);
    q.make();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
    setQr(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
  }, [code]);
  const Icon = ICON[tier];
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
    <section className={'mc mc-' + tier} aria-label="Thẻ hội viên">
      <div className="mc-top">
        <span className="mc-club">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={28} height={28} />
          {club || BRAND.name}
        </span>
        <span className="mc-tier">
          <Icon size={16} aria-hidden /> {TIER_LABEL[tier]}
        </span>
      </div>
      <div className="mc-body">
        <div className="mc-id">
          <small>Hội viên</small>
          <strong>{name}</strong>
          <button
            type="button"
            className="mc-code"
            onClick={copy}
            aria-label={`Sao chép mã ${code}`}
          >
            {code}
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          </button>
        </div>
        {qr && (
          <div
            className="mc-qr"
            role="img"
            aria-label="Mã QR của thẻ hội viên"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        )}
      </div>
      <dl className="mc-foot">
        <div>
          <dt>Điểm</dt>
          <dd>{points}</dd>
        </div>
        <div>
          <dt>Thẻ còn hạn đến</dt>
          <dd>{expires ? day(expires) : '—'}</dd>
        </div>
        <div>
          <dt>Tham gia</dt>
          <dd>{since ? day(since) : '—'}</dd>
        </div>
      </dl>
      <p className="mc-hint">Đưa mã này cho nhân viên khi đến quầy để được ghi nhận gói và điểm.</p>
    </section>
  );
}
