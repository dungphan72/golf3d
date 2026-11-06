'use client';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

/** Shared building blocks for the staff screens: page tabs, filter bar, chips, data table. */

export type TabItem = { key: string; label: string; count?: number; hidden?: boolean };

/** Page-level tabs (underline style): which sub-screen of the page is showing. */
export function PageTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="ds-tabs" role="tablist">
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={value === t.key}
            className={value === t.key ? 'active' : ''}
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.count != null && t.count > 0 && <b>{t.count}</b>}
          </button>
        ))}
    </div>
  );
}

/** Filter chips with live counts (one choice at a time). */
export function Chips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="ds-seg" role="group">
      {options.map((o) => (
        <button
          key={o.key}
          aria-pressed={value === o.key}
          className={value === o.key ? 'active' : ''}
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {o.count != null ? ` · ${o.count}` : ''}
        </button>
      ))}
    </div>
  );
}

/** Search box + chips + optional right-hand actions, in one row. */
export function FilterBar({
  search,
  onSearch,
  placeholder = 'Tìm…',
  label,
  children,
  right,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  label?: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="ds-filterbar">
      {onSearch && (
        <label className="ds-fsearch">
          <Search size={17} />
          <input
            aria-label={label ?? placeholder}
            placeholder={placeholder}
            value={search ?? ''}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      )}
      {children}
      {right && <div className="ds-filter-right">{right}</div>}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="ds-empty">
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
  className?: string;
};

/** One table for every list: same header, row, hover, empty state. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  emptyText,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: string;
  emptyText?: string;
}) {
  if (!rows.length) return <EmptyState title={empty} text={emptyText} />;
  return (
    <div className="table-wrap ds-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'right' : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={(c.align === 'right' ? 'right ' : '') + (c.className ?? '')}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
