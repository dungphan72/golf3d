import { money } from '../../lib/club';
import { packageBullets, type PackageGroup, type PriceRow, type PriceTable } from '../../lib/price-table';

const cell = (v: number | null) => (v == null ? '—' : money(v));
export const slot = (r: PriceRow) => `${r.days} · ${r.from}–${r.to}`;

/** Hour/9-hole/18-hole grid for one room type. */
export function RateGrid({ title, table }: { title?: string; table: PriceTable }) {
  const g = table.group;
  return (
    <div className="sg-panel">
      {title && <h3>{title}</h3>}
      <div className="sg-table">
        <table>
          <thead>
            <tr>
              <th>Khung giờ</th>
              <th>Luyện tập / giờ</th>
              <th>9 hố</th>
              <th>18 hố</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.key} className={r.gold ? 'gold' : undefined}>
                <td>
                  {slot(r)}
                  {r.gold && <span className="sg-tag">Giờ vàng</span>}
                </td>
                <td data-label="Luyện tập / giờ">{cell(r.gdr)}</td>
                <td data-label="9 hố">{cell(r.h9)}</td>
                <td data-label="18 hố">{cell(r.h18)}</td>
              </tr>
            ))}
            {(g.h9 != null || g.h18 != null) && (
              <tr>
                <td>Nhóm 4 người, cả ngày</td>
                <td data-label="Luyện tập / giờ">—</td>
                <td data-label="9 hố">{cell(g.h9)}</td>
                <td data-label="18 hố">{cell(g.h18)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Hourly-only price list, optionally with the VIP room as a second column. */
export function HourlyGrid({
  rows,
  vip,
}: {
  rows: PriceRow[];
  vip?: Map<string, PriceRow>;
}) {
  const one = vip ? 'Tiêu chuẩn / giờ' : 'Giá / giờ';
  return (
    <div className="sg-panel">
      <div className="sg-table">
        <table>
          <thead>
            <tr>
              <th>Khung giờ</th>
              <th>{one}</th>
              {vip && <th>VIP / giờ</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.gold ? 'gold' : undefined}>
                <td>
                  {slot(r)}
                  {r.gold && <span className="sg-tag">Giờ vàng</span>}
                </td>
                <td data-label={one}>{cell(r.gdr)}</td>
                {vip && <td data-label="VIP / giờ">{cell(vip.get(r.key)?.gdr ?? null)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Prepaid packages / membership cards of one group. */
export function PackageGrid({ group, vipOf }: { group: PackageGroup; vipOf: (p: PackageGroup['items'][number]) => boolean }) {
  return (
    <div id={group.id} className="sg-pkgroup">
      <h3>{group.title}</h3>
      <div className="sg-pkgrid">
        {group.items.map((p) => (
          <article key={p.id} className={vipOf(p) ? 'vip' : undefined}>
            <h4>{p.name}</h4>
            <strong>{money(p.price)}</strong>
            <ul>
              {packageBullets(p).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
