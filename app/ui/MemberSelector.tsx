'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Search,
  User,
  Phone,
  CreditCard,
  Star,
  Check,
  X,
  Package,
  Sparkles,
  UserPlus,
  Zap,
  Crown,
} from 'lucide-react';
import { memberCode, TIER_LABEL, type Tier } from '../../lib/member-card';
import { KIND_LABELS, UNLIMITED, type GrantKind } from '../../lib/member';

type Customer = {
  id: string;
  name: string;
  phone: string;
  note: string;
  points: number;
  account: number | null;
};

type OwnedPackage = {
  id: string;
  name: string;
  expires: number;
  balances: string | null;
};

export function MemberSelector({
  customer,
  phone,
  onChange,
  allowWalkIn = true,
  required = false,
}: {
  customer: string;
  phone: string;
  onChange: (customer: string, phone: string, memberId?: string) => void;
  allowWalkIn?: boolean;
  required?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [memberRank, setMemberRank] = useState<Tier>('guest');
  const [memberPackages, setMemberPackages] = useState<OwnedPackage[]>([]);
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search members debounced
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/members?q=${encodeURIComponent(query.trim())}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { customers: Customer[] };
          setResults(data.customers || []);
        }
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Load member packages when selected
  async function selectCustomer(c: Customer) {
    setSelectedMember(c);
    onChange(c.name, c.phone, c.id);
    setOpen(false);
    setQuery('');

    // Fetch packages for this member
    try {
      const res = await fetch(`/api/members?customer=${c.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { detail?: { packages: OwnedPackage[]; rank?: { tier: Tier } } };
        setMemberPackages(data.detail?.packages || []);
        setMemberRank(data.detail?.rank?.tier ?? 'guest');
      }
    } catch {
      /* ignore */
    }
  }

  function clearMember() {
    setSelectedMember(null);
    setMemberPackages([]);
    onChange('', '');
  }

  function pickWalkIn() {
    setSelectedMember(null);
    setMemberPackages([]);
    onChange('Khách vãng lai', '');
    setOpen(false);
  }

  const memberTier: Tier = selectedMember ? memberRank : 'guest';

  return (
    <div className="member-selector-widget" ref={dropdownRef}>
      {/* 1. If a verified member is selected */}
      {selectedMember ? (
        <div className="connected-member-card animate-fade-in">
          <div className="member-card-main">
            <div className={`member-avatar-ring tier-${memberTier}`}>
              {selectedMember.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="member-meta">
              <div className="member-name-row">
                <strong className="member-name">{selectedMember.name}</strong>
                <span className={`tier-badge-pill tier-${memberTier}`}>
                  {TIER_LABEL[memberTier]}
                </span>
                <span className="code-badge">{memberCode(selectedMember.id)}</span>
              </div>
              <div className="member-sub-row">
                <span className="member-phone">
                  <Phone size={11} /> {selectedMember.phone || 'Chưa có SĐT'}
                </span>
                <span className="member-points">
                  <Star size={11} className="star-icon" /> {selectedMember.points} điểm tích lũy
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-change-member"
              onClick={clearMember}
              title="Đổi hoặc chọn khách khác"
            >
              <X size={14} /> Đổi khách
            </button>
          </div>

          {/* Active packages banner if member has packages */}
          {memberPackages.length > 0 && (
            <div className="member-packages-strip">
              <div className="pkg-strip-title">
                <Package size={13} className="text-emerald" />
                <span>Gói quyền lợi đang có ({memberPackages.length}):</span>
              </div>
              <div className="pkg-strip-list">
                {memberPackages.map((p) => {
                  const isExpired = p.expires < Date.now();
                  const balances = JSON.parse(p.balances ?? '[]') as {
                    kind: GrantKind;
                    remaining: number;
                  }[];
                  return (
                    <span
                      key={p.id}
                      className={`pkg-strip-tag ${isExpired ? 'expired' : 'active'}`}
                    >
                      <strong>{p.name}</strong>
                      {balances.map((b, i) => (
                        <em key={i}>
                          · {b.remaining >= UNLIMITED ? 'Không giới hạn' : b.remaining}{' '}
                          {KIND_LABELS[b.kind]}
                        </em>
                      ))}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hidden inputs to preserve FormData compatibility */}
          <input type="hidden" name="customer" value={selectedMember.name} />
          <input type="hidden" name="phone" value={selectedMember.phone} />
        </div>
      ) : (
        /* 2. Search / Selection Bar */
        <div className="member-search-container">
          <div className="member-input-row">
            <div className="search-field-wrap">
              <Search size={15} className="search-prefix-icon" />
              <input
                type="text"
                className="member-search-input"
                placeholder="Tìm hội viên theo Tên, Số điện thoại hoặc Mã thẻ (HV-…)"
                value={mode === 'manual' ? customer : query}
                onChange={(e) => {
                  if (mode === 'manual') {
                    onChange(e.target.value, phone);
                  } else {
                    setQuery(e.target.value);
                    setOpen(true);
                  }
                }}
                onFocus={() => {
                  if (mode === 'search') setOpen(true);
                }}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="btn-clear-query"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Walk-In Button */}
            {allowWalkIn && (
              <button
                type="button"
                className="btn-quick-walkin"
                onClick={pickWalkIn}
                title="Khách vãng lai không cần nhập số điện thoại"
              >
                <Zap size={13} /> Khách vãng lai
              </button>
            )}

            {/* Toggle Manual input mode */}
            <button
              type="button"
              className="btn-toggle-manual"
              onClick={() => {
                setMode(mode === 'search' ? 'manual' : 'search');
                setOpen(false);
              }}
              title={mode === 'manual' ? 'Chuyển sang tìm trong danh sách' : 'Nhập tự do'}
            >
              {mode === 'manual' ? 'Tìm danh sách' : 'Nhập tay'}
            </button>
          </div>

          {/* Manual Input Fields (shown if in manual mode or if non-member customer name exists) */}
          {(mode === 'manual' || (customer && !selectedMember && customer !== 'Khách vãng lai')) && (
            <div className="manual-inputs-grid animate-fade-in">
              <label className="manual-field">
                <span className="manual-label">Họ và tên *</span>
                <input
                  name="customer"
                  value={customer}
                  onChange={(e) => onChange(e.target.value, phone)}
                  placeholder="VD: Nguyễn Văn Nam"
                  required={required}
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label className="manual-field">
                <span className="manual-label">Số điện thoại</span>
                <input
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => onChange(customer, e.target.value)}
                  placeholder="VD: 0912345678"
                  required={required}
                  maxLength={20}
                />
              </label>
            </div>
          )}

          {/* Autocomplete Dropdown List */}
          {open && mode === 'search' && (
            <div className="member-results-dropdown animate-fade-in">
              {searching && (
                <div className="dropdown-status">
                  <span className="spinner-dot" /> Đang tìm kiếm hội viên…
                </div>
              )}

              {!searching && results.length > 0 && (
                <ul className="member-dropdown-list">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="member-dropdown-item"
                        onClick={() => selectCustomer(c)}
                      >
                        <div className="item-avatar">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="item-info">
                          <div className="item-top">
                            <strong className="item-name">{c.name}</strong>
                            <span className="item-code">{memberCode(c.id)}</span>
                          </div>
                          <div className="item-bottom">
                            <span className="item-phone">{c.phone}</span>
                            <span className="item-divider">·</span>
                            <span className="item-points">★ {c.points} điểm</span>
                          </div>
                        </div>
                        <span className="item-select-hint">Chọn</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <div className="dropdown-empty">
                  <p>Không tìm thấy hội viên nào khớp với &quot;{query}&quot;</p>
                  <button
                    type="button"
                    className="btn-create-adhoc link-btn"
                    onClick={() => {
                      onChange(query.trim(), '');
                      setMode('manual');
                      setOpen(false);
                    }}
                  >
                    + Sử dụng &quot;{query}&quot; làm khách mới
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Hidden inputs to guarantee form submit has customer and phone if not in manual mode */}
          {mode === 'search' && !selectedMember && (
            <>
              <input type="hidden" name="customer" value={customer} />
              <input type="hidden" name="phone" value={phone} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
