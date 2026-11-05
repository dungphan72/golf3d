import { Gift } from 'lucide-react';
import type { PublicPromotion } from '../../lib/server/pricing-service';

/** Running promotions from the admin, shown on the home page and the price page. */
export function PromoCards({ promotions }: { promotions: PublicPromotion[] }) {
  if (!promotions.length) return null;
  return (
    <div className="fw-promos" data-sc-in data-sc-stagger="70">
      {promotions.map((p) => (
        <article key={p.id}>
          <Gift size={20} />
          <h3>{p.name}</h3>
          <strong>{p.benefit}</strong>
          <p>{p.condition}</p>
          {p.description && <p>{p.description}</p>}
          <small>
            {p.auto ? 'Tự động áp dụng khi tính tiền' : 'Áp dụng tại quầy, nhân viên xác nhận'}
          </small>
        </article>
      ))}
    </div>
  );
}
