'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { createRoot } from 'react-dom/client';

/** Shared building blocks for the staff screens: page tabs, filter bar, chips, data table. */

export type TabItem = { key: string; label: string; count?: number; hidden?: boolean };

/** Page-level tabs (underline style): which sub-screen of the page is showing. */
export function PageTabs({
  tabs,
  value,
  onChange,
  sub = false,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  /** Compact pill tabs for a tab bar nested under another one. */
  sub?: boolean;
}) {
  return (
    <div
      className={sub ? 'ds-tabs sub' : 'ds-tabs'}
      role="tablist"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const tabsEl = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')];
        const i = tabsEl.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        const next = tabsEl[(i + (e.key === 'ArrowRight' ? 1 : tabsEl.length - 1)) % tabsEl.length];
        next.focus();
        next.click();
        e.preventDefault();
      }}
    >
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={value === t.key}
            tabIndex={value === t.key ? 0 : -1}
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
  onRowClick,
  rowActive,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  rowActive?: (row: T) => boolean;
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
            <tr
              key={rowKey(r)}
              className={(onRowClick ? 'clickable ' : '') + (rowActive?.(r) ? 'selected' : '')}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
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

/** Loading placeholder: skeleton lines, announced politely to screen readers. */
export function Loading({ rows = 3, label = 'Đang tải' }: { rows?: number; label?: string }) {
  return (
    <div className="ds-loading" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="ds-skel" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export type Tone = 'ok' | 'info' | 'warn' | 'late' | 'muted';
const TONE_MARK: Record<Tone, string> = { ok: '✓', info: '●', warn: '!', late: '⚠', muted: '–' };
/** Status label whose meaning never depends on colour alone: a mark plus the text. */
export function StatusBadge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`ds-badge ${tone}`}>
      <i aria-hidden="true">{TONE_MARK[tone]}</i>
      {children}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'late' | 'warn';
  hint?: string;
}) {
  return (
    <div className={'ds-tile' + (tone ? ' ' + tone : '')}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** A labelled form field: visible label, optional hint, error next to the input. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="ds-field">
      <span>{label}</span>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <small className="err">{error}</small>}
    </label>
  );
}

type AskOptions = {
  title: string;
  label?: string;
  initial?: string;
  confirmLabel?: string;
  /** Minimum length of the answer (prompt only). */
  min?: number;
  numeric?: boolean;
  danger?: boolean;
  message?: string;
};
type Pending =
  (AskOptions & { kind: 'prompt' | 'confirm'; done: (v: string | null) => void }) | null;

/**
 * Replacement for window.prompt and window.confirm: a real dialog with a visible label, keyboard
 * and screen-reader support (native <dialog>), and validation. `node` must be rendered once.
 */
export function useDialogs() {
  const [pending, setPending] = useState<Pending>(null);
  const ask = useCallback(
    (kind: 'prompt' | 'confirm', o: AskOptions) =>
      new Promise<string | null>((resolve) => setPending({ ...o, kind, done: resolve })),
    [],
  );
  const prompt = useCallback((o: AskOptions) => ask('prompt', o), [ask]);
  const confirm = useCallback(
    async (o: AskOptions | string) =>
      (await ask('confirm', typeof o === 'string' ? { title: o } : o)) !== null,
    [ask],
  );
  const node = pending ? (
    <AskDialog
      key={pending.title}
      o={pending}
      onClose={(v) => {
        pending.done(v);
        setPending(null);
      }}
    />
  ) : null;
  return { prompt, confirm, node };
}

export function AskDialog({
  o,
  onClose,
}: {
  o: NonNullable<Pending>;
  onClose: (v: string | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(o.initial ?? '');
  const [error, setError] = useState('');
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const submit = () => {
    if (o.kind === 'prompt') {
      const v = value.trim();
      if (v.length < (o.min ?? 1)) return setError(`Nhập ít nhất ${o.min ?? 1} ký tự`);
      if (o.numeric && !(Number(v.replace(/\D/g, '')) > 0))
        return setError('Nhập một số lớn hơn 0');
      return onClose(o.numeric ? v.replace(/\D/g, '') : v);
    }
    onClose('ok');
  };
  return (
    <dialog
      className="native-dialog ds-ask"
      ref={ref}
      onCancel={() => onClose(null)}
      aria-label={o.title}
    >
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3>{o.title}</h3>
        {o.message && <p>{o.message}</p>}
        {o.kind === 'prompt' && (
          <Field label={o.label ?? 'Nội dung'} error={error}>
            <input
              autoFocus
              inputMode={o.numeric ? 'numeric' : undefined}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
            />
          </Field>
        )}
        <div className="ds-ask-actions">
          <button type="button" className="secondary" onClick={() => onClose(null)}>
            Hủy
          </button>
          <button
            type="submit"
            className={o.danger ? 'primary danger' : 'primary'}
            autoFocus={o.kind === 'confirm'}
          >
            {o.confirmLabel ?? 'Xác nhận'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function openAsk(kind: 'prompt' | 'confirm', o: AskOptions) {
  return new Promise<string | null>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (v: string | null) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(<AskDialog o={{ ...o, kind, done: close }} onClose={close} />);
  });
}
/** Dialog helpers for event handlers outside a hook: `await askText(...)`, `await askConfirm(...)`. */
export const askText = (o: AskOptions) => openAsk('prompt', o);
export const askConfirm = async (o: AskOptions | string) =>
  (await openAsk('confirm', typeof o === 'string' ? { title: o } : o)) !== null;
