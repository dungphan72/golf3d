'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Store,
  Flag,
  Clock,
  LayoutGrid,
  Tag,
  Coins,
  Layers,
  Crown,
  Percent,
  Package,
  Coffee,
  CheckCircle2,
  Box,
  Truck,
  Users,
  Target,
  Filter,
  Mail,
  Users2,
  Calendar,
  CalendarCheck,
  Trophy,
  GraduationCap,
  UserPlus,
  CreditCard,
  FileText,
  Link2,
  Megaphone,
  ShieldCheck,
  UserCheck,
  Settings2,
  Database,
  FileSpreadsheet,
  ChevronRight,
  Search,
  X,
  Save,
  Check,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  Download,
  RefreshCw,
} from 'lucide-react';
import { rooms, money, type Config } from '../../lib/club';
import { officialPriceRules } from '../../lib/official-pricing';
import { syncRulesWithRates } from '../../lib/price-sync';
import { operationKey } from '../../lib/finance';
import type { MenuItem } from '../../lib/fnb';
import type { Data } from './shared';
import { PackageCatalogManager } from './PackageEditor';
import { SepaySettings } from './SepaySettings';
import { StaffPanel } from './StaffPanel';
import { SEPAY_BANKS, sepayQrUrl } from '../../lib/bank';
import '../system-settings.css';

export type SettingsCardId =
  | 'facility_info'
  | 'rooms_lines'
  | 'operating_hours'
  | 'facility_layout'
  | 'pricing_rates'
  | 'hour_packages'
  | 'membership_tiers'
  | 'promotions_vouchers'
  | 'fnb_menu'
  | 'extra_services'
  | 'inventory_stock'
  | 'suppliers_vendor'
  | 'crm_lead_sources'
  | 'crm_pipeline'
  | 'crm_automation'
  | 'crm_tags'
  | 'booking_rules'
  | 'tournament_settings'
  | 'academy_coaching'
  | 'matchmaking'
  | 'payment_methods'
  | 'invoice_tax'
  | 'system_integrations'
  | 'marketing_tools'
  | 'staff_roles'
  | 'general_config'
  | 'security_backup'
  | 'audit_logs'
  | string;

type FilterTab = 'all' | 'operation' | 'business' | 'crm' | 'system';

const ICON_MAP: Record<string, typeof Store> = {
  Store,
  Flag,
  Clock,
  LayoutGrid,
  Coins,
  Layers,
  Crown,
  Percent,
  Coffee,
  CheckCircle2,
  Box,
  Truck,
  Target,
  Filter,
  Mail,
  Users2,
  CalendarCheck,
  Trophy,
  GraduationCap,
  UserPlus,
  CreditCard,
  FileText,
  Link2,
  Megaphone,
  UserCheck,
  Settings2,
  Database,
  FileSpreadsheet,
  Building2,
  Tag,
  Package,
  Users,
  Calendar,
  ShieldCheck,
};

interface CardDef {
  id: SettingsCardId;
  title: string;
  subtitle: string;
  iconName: string;
  iconBg: string;
  categoryGroup: string;
  tab: 'operation' | 'business' | 'crm' | 'system';
}

interface GroupDef {
  id: string;
  title: string;
  iconName: string;
  tab: 'operation' | 'business' | 'crm' | 'system';
  cards: CardDef[];
}

const DEFAULT_GROUPS: GroupDef[] = [
  {
    id: 'facility',
    title: 'Thông tin cơ sở & vận hành',
    iconName: 'Building2',
    tab: 'operation',
    cards: [
      {
        id: 'facility_info',
        title: 'Thông tin cơ sở',
        subtitle: 'Tên, địa chỉ, liên hệ, logo',
        iconName: 'Store',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Thông tin cơ sở & vận hành',
        tab: 'operation',
      },
      {
        id: 'rooms_lines',
        title: 'Khu vực & Line/Phòng',
        subtitle: 'Quản lý line, phòng VIP, line tay trái',
        iconName: 'Flag',
        iconBg: 'ar-icon-blue',
        categoryGroup: 'Thông tin cơ sở & vận hành',
        tab: 'operation',
      },
      {
        id: 'operating_hours',
        title: 'Giờ hoạt động',
        subtitle: 'Giờ mở cửa, khung giờ, ngày lễ',
        iconName: 'Clock',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Thông tin cơ sở & vận hành',
        tab: 'operation',
      },
      {
        id: 'facility_layout',
        title: 'Sơ đồ cơ sở',
        subtitle: 'Cài đặt sơ đồ, vị trí line trên POS',
        iconName: 'LayoutGrid',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Thông tin cơ sở & vận hành',
        tab: 'operation',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Giá, gói & hội viên',
    iconName: 'Tag',
    tab: 'business',
    cards: [
      {
        id: 'pricing_rates',
        title: 'Bảng giá',
        subtitle: 'Giá theo giờ, ngày, khung giờ',
        iconName: 'Coins',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Giá, gói & hội viên',
        tab: 'business',
      },
      {
        id: 'hour_packages',
        title: 'Gói giờ & Thẻ chi tiết',
        subtitle: 'Thêm, sửa, xóa gói giờ chơi, thẻ tháng, quyền lợi & đồng bộ bảng giá',
        iconName: 'Layers',
        iconBg: 'ar-icon-blue',
        categoryGroup: 'Giá, gói & hội viên',
        tab: 'business',
      },
      {
        id: 'membership_tiers',
        title: 'Hội viên',
        subtitle: 'Hạng hội viên, quyền lợi, điều kiện nâng hạng',
        iconName: 'Crown',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Giá, gói & hội viên',
        tab: 'business',
      },
      {
        id: 'promotions_vouchers',
        title: 'Ưu đãi & Mã giảm giá',
        subtitle: 'Promotion, voucher, combo',
        iconName: 'Percent',
        iconBg: 'ar-icon-pink',
        categoryGroup: 'Giá, gói & hội viên',
        tab: 'business',
      },
    ],
  },
  {
    id: 'products',
    title: 'Sản phẩm, dịch vụ & kho',
    iconName: 'Package',
    tab: 'business',
    cards: [
      {
        id: 'fnb_menu',
        title: 'Sản phẩm F&B',
        subtitle: 'Đồ ăn, thức uống, combo',
        iconName: 'Coffee',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Sản phẩm, dịch vụ & kho',
        tab: 'business',
      },
      {
        id: 'extra_services',
        title: 'Dịch vụ bổ sung',
        subtitle: 'Thuê gậy, caddie, phòng học, khác',
        iconName: 'CheckCircle2',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Sản phẩm, dịch vụ & kho',
        tab: 'business',
      },
      {
        id: 'inventory_stock',
        title: 'Quản lý kho',
        subtitle: 'Nhập, xuất, tồn kho',
        iconName: 'Box',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Sản phẩm, dịch vụ & kho',
        tab: 'business',
      },
      {
        id: 'suppliers_vendor',
        title: 'Nhà cung cấp',
        subtitle: 'Danh sách và công nợ NCC',
        iconName: 'Truck',
        iconBg: 'ar-icon-purple',
        categoryGroup: 'Sản phẩm, dịch vụ & kho',
        tab: 'business',
      },
    ],
  },
  {
    id: 'crm',
    title: 'Khách hàng & CRM',
    iconName: 'Users',
    tab: 'crm',
    cards: [
      {
        id: 'crm_lead_sources',
        title: 'Nguồn lead',
        subtitle: 'Kênh thu lead (Web, FB, Zalo, Form...)',
        iconName: 'Target',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Khách hàng & CRM',
        tab: 'crm',
      },
      {
        id: 'crm_pipeline',
        title: 'Pipeline bán hàng',
        subtitle: 'Giai đoạn, quy trình xử lý',
        iconName: 'Filter',
        iconBg: 'ar-icon-blue',
        categoryGroup: 'Khách hàng & CRM',
        tab: 'crm',
      },
      {
        id: 'crm_automation',
        title: 'Kịch bản chăm sóc',
        subtitle: 'Tự động hóa SMS/Zalo/Email',
        iconName: 'Mail',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Khách hàng & CRM',
        tab: 'crm',
      },
      {
        id: 'crm_tags',
        title: 'Phân nhóm khách hàng',
        subtitle: 'Nhóm, thẻ tag, phân loại',
        iconName: 'Users2',
        iconBg: 'ar-icon-purple',
        categoryGroup: 'Khách hàng & CRM',
        tab: 'crm',
      },
    ],
  },
  {
    id: 'booking_activity',
    title: 'Đặt sân, giải đấu & huấn luyện',
    iconName: 'Calendar',
    tab: 'operation',
    cards: [
      {
        id: 'booking_rules',
        title: 'Cài đặt đặt sân',
        subtitle: 'Quy tắc đặt, cọc, hủy, thay đổi',
        iconName: 'CalendarCheck',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
        tab: 'operation',
      },
      {
        id: 'tournament_settings',
        title: 'Giải đấu (Tournament)',
        subtitle: 'Thể thức, bảng điểm, xếp hạng',
        iconName: 'Trophy',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
        tab: 'operation',
      },
      {
        id: 'academy_coaching',
        title: 'Huấn luyện (Academy)',
        subtitle: 'HLV, khóa học, lịch học, học viên',
        iconName: 'GraduationCap',
        iconBg: 'ar-icon-purple',
        categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
        tab: 'operation',
      },
      {
        id: 'matchmaking',
        title: 'Tìm bạn chơi',
        subtitle: 'Bật/tắt và cài đặt tính năng',
        iconName: 'UserPlus',
        iconBg: 'ar-icon-sky',
        categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
        tab: 'operation',
      },
    ],
  },
  {
    id: 'payment_integration',
    title: 'Thanh toán & tích hợp',
    iconName: 'CreditCard',
    tab: 'system',
    cards: [
      {
        id: 'payment_methods',
        title: 'Cổng thanh toán SePay & Ngân hàng',
        subtitle: 'Tích hợp my.sepay.vn, mã QR động, Webhook báo có tự động & tiền mặt',
        iconName: 'CreditCard',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Thanh toán & tích hợp',
        tab: 'system',
      },
      {
        id: 'invoice_tax',
        title: 'Hóa đơn & Thuế',
        subtitle: 'Mẫu hóa đơn, thuế VAT, phí dịch vụ',
        iconName: 'FileText',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Thanh toán & tích hợp',
        tab: 'system',
      },
      {
        id: 'system_integrations',
        title: 'Tích hợp hệ thống',
        subtitle: 'Máy POS, máy in, SMS, Zalo, Email, Google Maps, Cloud',
        iconName: 'Link2',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Thanh toán & tích hợp',
        tab: 'system',
      },
      {
        id: 'marketing_tools',
        title: 'Công cụ marketing',
        subtitle: 'Zalo OA, Facebook, Google, UTM tracking',
        iconName: 'Megaphone',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Thanh toán & tích hợp',
        tab: 'system',
      },
    ],
  },
  {
    id: 'system_users',
    title: 'Người dùng, phân quyền & hệ thống',
    iconName: 'ShieldCheck',
    tab: 'system',
    cards: [
      {
        id: 'staff_roles',
        title: 'Tài khoản & Phân quyền',
        subtitle: 'Nhân viên, vai trò, quyền truy cập',
        iconName: 'UserCheck',
        iconBg: 'ar-icon-emerald',
        categoryGroup: 'Người dùng, phân quyền & hệ thống',
        tab: 'system',
      },
      {
        id: 'general_config',
        title: 'Cấu hình chung',
        subtitle: 'Ngôn ngữ, tiền tệ, định dạng, thông báo',
        iconName: 'Settings2',
        iconBg: 'ar-icon-amber',
        categoryGroup: 'Người dùng, phân quyền & hệ thống',
        tab: 'system',
      },
      {
        id: 'security_backup',
        title: 'Bảo mật & Sao lưu',
        subtitle: 'Mật khẩu, 2FA, sao lưu dữ liệu',
        iconName: 'Database',
        iconBg: 'ar-icon-blue',
        categoryGroup: 'Người dùng, phân quyền & hệ thống',
        tab: 'system',
      },
      {
        id: 'audit_logs',
        title: 'Nhật ký hoạt động',
        subtitle: 'Lịch sử thao tác, truy cập',
        iconName: 'FileSpreadsheet',
        iconBg: 'ar-icon-purple',
        categoryGroup: 'Người dùng, phân quyền & hệ thống',
        tab: 'system',
      },
    ],
  },
];

const STORAGE_KEY_GROUPS = 'sigolf_settings_groups_v1';

export function SystemSettingsHub({
  config,
  busy,
  data,
  activeSub,
  onSelectSub,
  initialOpenCardId,
  onClearInitialOpenCard,
  onSave,
  onGo,
  onChanged,
}: {
  config: Config;
  busy?: boolean;
  data: Data | null;
  activeSub?: string;
  onSelectSub?: (sub: string) => void;
  initialOpenCardId?: SettingsCardId | null;
  onClearInitialOpenCard?: () => void;
  onSave: (val: Partial<Config>) => Promise<boolean> | void;
  onGo?: (v: string) => void;
  onChanged?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCard, setOpenCard] = useState<CardDef | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);

  // Persisted customizable groups & cards
  const [groups, setGroups] = useState<GroupDef[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_GROUPS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved) as GroupDef[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_GROUPS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    } catch {
      /* ignore */
    }
  }, [groups]);

  useEffect(() => {
    if (!initialOpenCardId) return;
    let cancelled = false;
    // Deferred so state is not set synchronously inside the effect body.
    queueMicrotask(() => {
    if (cancelled) return;
    for (const g of groups) {
      const found = g.cards.find((c) => c.id === initialOpenCardId);
      if (found) {
        setOpenCard(found);
        onClearInitialOpenCard?.();
        return;
      }
    }
    const fallback: CardDef = {
      id: initialOpenCardId,
      title: getCardTitle(initialOpenCardId),
      subtitle: getCardSubtitle(initialOpenCardId),
      iconName: 'Layers',
      iconBg: 'ar-icon-blue',
      categoryGroup: 'Giá, gói & hội viên',
      tab: 'business',
    };
    setOpenCard(fallback);
    onClearInitialOpenCard?.();
    });
    return () => {
      cancelled = true;
    };
  }, [initialOpenCardId, groups, onClearInitialOpenCard]);

  // Modal for Adding or Editing a Function Card on the Hub
  const [cardEditor, setCardEditor] = useState<{
    mode: 'add' | 'edit';
    groupId: string;
    newGroupTitle?: string;
    card: CardDef;
  } | null>(null);

  // Local draft states for modals
  const [draftConfig, setDraftConfig] = useState<Config>(config);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sync with sidebar active sub
  const effectiveTab = useMemo(() => {
    if (activeSub === 'facility') return 'operation';
    if (activeSub === 'hours') return 'operation';
    if (activeSub === 'pricing') return 'business';
    if (activeSub === 'packages') return 'business';
    if (activeSub === 'payment') return 'system';
    if (activeSub === 'staff') return 'system';
    if (activeSub === 'integration') return 'system';
    if (activeSub === 'security') return 'system';
    return activeTab;
  }, [activeSub, activeTab]);

  // Filter groups according to activeTab & searchQuery
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups
      .map((group) => {
        const tabMatch = effectiveTab === 'all' || group.tab === effectiveTab;
        if (!tabMatch && !q) return null;

        const cards = group.cards.filter((card) => {
          if (!q) return true;
          return (
            card.title.toLowerCase().includes(q) ||
            card.subtitle.toLowerCase().includes(q) ||
            card.categoryGroup.toLowerCase().includes(q)
          );
        });

        if (cards.length === 0 && !manageMode) return null;
        return { ...group, cards };
      })
      .filter(Boolean) as GroupDef[];
  }, [groups, effectiveTab, searchQuery, manageMode]);

  // Save handler for Config (Single Source of Truth)
  const handleSaveConfig = async (patch: Partial<Config>) => {
    const next = { ...draftConfig, ...patch };
    setDraftConfig(next);
    await onSave(patch);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
    }
    showToast('Đã lưu cấu hình thành công!');
    setOpenCard(null);
    onChanged?.();
  };

  // Inline save handler for CRUD tables without closing modal
  const handleSyncTable = async (storageKey: string, nextRows: Record<string, string>[]) => {
    const nextCustomTables = {
      ...(draftConfig.customTables ?? config.customTables ?? {}),
      [storageKey]: nextRows,
    };
    const patch: Partial<Config> = { customTables: nextCustomTables };
    if (storageKey === 'promotions_vouchers') {
      patch.offers = nextRows
        .filter((r) => !r.st || !r.st.toLowerCase().includes('dừng'))
        .map((r) => `${r.name || r.code} | ${r.val || ''} | Mã: ${r.code || ''} · Hạn: ${r.exp || 'Đang áp dụng'}`);
    }
    setDraftConfig((prev) => ({ ...prev, ...patch }));
    await onSave(patch);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
    }
    onChanged?.();
  };

  const openAddCardModal = (defaultGroupId?: string) => {
    const targetGroup = groups.find((g) => g.id === defaultGroupId) ?? groups[0];
    setCardEditor({
      mode: 'add',
      groupId: targetGroup?.id || 'facility',
      newGroupTitle: '',
      card: {
        id: 'custom_' + crypto.randomUUID().slice(0, 8),
        title: '',
        subtitle: '',
        iconName: 'Settings2',
        iconBg: 'ar-icon-emerald',
        categoryGroup: targetGroup?.title || 'Thông tin cơ sở & vận hành',
        tab: targetGroup?.tab || 'operation',
      },
    });
  };

  const openEditCardModal = (groupId: string, card: CardDef, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardEditor({
      mode: 'edit',
      groupId,
      card: { ...card },
    });
  };

  const handleDeleteCard = (groupId: string, card: CardDef, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroups((prev) =>
      prev
        .map((g) =>
          g.id === groupId ? { ...g, cards: g.cards.filter((c) => c.id !== card.id) } : g,
        )
        .filter((g) => g.cards.length > 0 || DEFAULT_GROUPS.some((dg) => dg.id === g.id)),
    );
    showToast(`Đã xóa chức năng "${card.title}"`);
  };

  const handleSaveCardEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardEditor) return;
    const { mode, groupId, newGroupTitle, card } = cardEditor;
    if (!card.title.trim()) {
      showToast('Vui lòng nhập tên chức năng!');
      return;
    }

    if (groupId === '__new__') {
      const gTitle = (newGroupTitle || 'Nhóm chức năng mới').trim();
      const newGid = 'grp_' + crypto.randomUUID().slice(0, 6);
      const finalCard: CardDef = {
        ...card,
        title: card.title.trim(),
        subtitle: card.subtitle.trim() || 'Cấu hình và tùy chỉnh chức năng',
        categoryGroup: gTitle,
      };
      setGroups((prev) => [
        ...prev,
        {
          id: newGid,
          title: gTitle,
          iconName: 'Settings2',
          tab: card.tab,
          cards: [finalCard],
        },
      ]);
      showToast(`Đã tạo nhóm "${gTitle}" và thêm chức năng "${finalCard.title}"!`);
    } else if (mode === 'add') {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const finalCard: CardDef = {
            ...card,
            title: card.title.trim(),
            subtitle: card.subtitle.trim() || 'Cấu hình và tùy chỉnh chức năng',
            categoryGroup: g.title,
            tab: g.tab,
          };
          return { ...g, cards: [...g.cards, finalCard] };
        }),
      );
      showToast(`Đã thêm chức năng "${card.title.trim()}"!`);
    } else {
      // Edit mode (supports moving between groups as well)
      setGroups((prev) => {
        const destGroup = prev.find((g) => g.id === groupId);
        const updatedCard: CardDef = {
          ...card,
          title: card.title.trim(),
          subtitle: card.subtitle.trim(),
          categoryGroup: destGroup?.title || card.categoryGroup,
          tab: destGroup?.tab || card.tab,
        };
        return prev.map((g) => {
          const withoutOld = g.cards.filter((c) => c.id !== card.id);
          if (g.id === groupId) {
            const existedInThisGroup = g.cards.some((c) => c.id === card.id);
            return {
              ...g,
              cards: existedInThisGroup
                ? g.cards.map((c) => (c.id === card.id ? updatedCard : c))
                : [...withoutOld, updatedCard],
            };
          }
          return { ...g, cards: withoutOld };
        });
      });
      showToast(`Đã cập nhật chức năng "${card.title.trim()}"!`);
    }
    setCardEditor(null);
  };

  const handleResetDefaults = () => {
    setGroups(DEFAULT_GROUPS);
    try {
      window.localStorage.removeItem(STORAGE_KEY_GROUPS);
    } catch {
      /* ignore */
    }
    showToast('Đã khôi phục toàn bộ 28 chức năng mặc định!');
  };

  return (
    <div className="ar-settings-hub">
      {/* Page Header */}
      <div className="ar-settings-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="ar-settings-header-icon">
            <Settings2 />
          </div>
          <div className="ar-settings-header-text">
            <h1>Cài đặt hệ thống</h1>
            <p>Quản trị và cấu hình toàn bộ chức năng của ứng dụng (Cho phép Thêm / Sửa / Xóa chức năng)</p>
          </div>
        </div>

        {/* Admin CRUD Toolbar on Header */}
        <div className="ar-settings-crud-bar">
          <button
            type="button"
            className={`ar-crud-toggle-btn ${manageMode ? 'active' : ''}`}
            onClick={() => setManageMode(!manageMode)}
          >
            <Edit3 size={15} />
            <span>{manageMode ? 'Hoàn tất chỉnh sửa' : 'Sửa / Xóa chức năng'}</span>
          </button>
          <button
            type="button"
            className="ar-btn-primary"
            onClick={() => openAddCardModal()}
          >
            <Plus size={16} />
            <span>Thêm chức năng</span>
          </button>
          {manageMode && (
            <button
              type="button"
              className="ar-btn-secondary"
              onClick={handleResetDefaults}
              title="Khôi phục 28 chức năng mặc định"
            >
              <RotateCcw size={15} />
              <span>Khôi phục mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs (Pills) */}
      <div className="ar-settings-filters" role="tablist">
        {[
          { key: 'all', label: 'Tổng hợp' },
          { key: 'operation', label: 'Vận hành' },
          { key: 'business', label: 'Kinh doanh' },
          { key: 'crm', label: 'Khách hàng' },
          { key: 'system', label: 'Hệ thống' },
        ].map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={effectiveTab === t.key}
            className={`ar-filter-pill ${effectiveTab === t.key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(t.key as FilterTab);
              onSelectSub?.('all');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="ar-settings-search-bar">
        <Search />
        <input
          type="text"
          placeholder="Tìm kiếm chức năng, cài đặt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="ar-settings-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Xóa tìm kiếm"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Inline Unified Package & Card Catalog when activeSub === 'packages' */}
      {activeSub === 'packages' && (
        <section
          className="ar-settings-group"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 5,
            padding: 20,
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ar-card-icon ar-icon-blue" style={{ width: 40, height: 40 }}>
                <Layers />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Quản lý Gói giờ & Thẻ chi tiết (Đồng bộ toàn hệ thống)
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                  Thêm, sửa, xóa gói giờ chơi, thẻ tháng, quyền lợi VIP — cập nhật trực tiếp lên POS, Hội viên và /bang-gia
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ar-btn-secondary"
              onClick={() => onSelectSub?.('all')}
            >
              Xem tất cả danh mục cài đặt
            </button>
          </div>
          <PackageCatalogManager
            canAdjust
            onChanged={onChanged}
            onNotify={showToast}
          />
        </section>
      )}

      {/* Inline SePay Payment Gateway Panel when activeSub === 'payment' */}
      {activeSub === 'payment' && (
        <section
          className="ar-settings-group"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 5,
            padding: 20,
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ar-card-icon ar-icon-emerald" style={{ width: 40, height: 40 }}>
                <CreditCard />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Cổng thanh toán tự động SePay (https://my.sepay.vn)
                </h3>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                  Cấu hình tài khoản nhận tiền, khóa Webhook API Key và đối soát báo có tự động theo thời gian thực
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ar-btn-secondary"
              onClick={() => {
                for (const g of groups) {
                  const found = g.cards.find((c) => c.id === 'payment_methods');
                  if (found) {
                    setOpenCard(found);
                    return;
                  }
                }
              }}
            >
              Đổi số tài khoản ngân hàng
            </button>
          </div>
          <SepaySettings />
        </section>
      )}

      {/* 7 Category Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
          Không tìm thấy chức năng hoặc cài đặt phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        filteredGroups.map((group) => {
          const GIcon = ICON_MAP[group.iconName] || Building2;
          return (
            <section key={group.id} className="ar-settings-group" id={`group-${group.id}`}>
              <div className="ar-group-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GIcon />
                  <span>{group.title}</span>
                </div>
                {manageMode && (
                  <button
                    type="button"
                    className="ar-group-add-btn"
                    onClick={() => openAddCardModal(group.id)}
                  >
                    <Plus size={14} /> Thêm vào nhóm này
                  </button>
                )}
              </div>
              <div className="ar-cards-grid">
                {group.cards.map((card) => {
                  const CIcon = ICON_MAP[card.iconName] || Settings2;
                  return (
                    <div
                      key={card.id}
                      role="button"
                      tabIndex={0}
                      className={`ar-card-item ${manageMode ? 'is-managing' : ''}`}
                      onClick={() => setOpenCard(card)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpenCard(card);
                        }
                      }}
                    >
                      <div className={`ar-card-icon ${card.iconBg}`}>
                        <CIcon />
                      </div>
                      <div className="ar-card-content">
                        <h3 className="ar-card-title">{card.title}</h3>
                        <p className="ar-card-subtitle">{card.subtitle}</p>
                      </div>
                      <div className="ar-card-actions-wrap">
                        <button
                          type="button"
                          className="ar-card-mini-btn edit"
                          title={`Sửa chức năng ${card.title}`}
                          aria-label={`Sửa ${card.title}`}
                          onClick={(e) => openEditCardModal(group.id, card, e)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="ar-card-mini-btn delete"
                          title={`Xóa chức năng ${card.title}`}
                          aria-label={`Xóa ${card.title}`}
                          onClick={(e) => handleDeleteCard(group.id, card, e)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight className="ar-card-arrow" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {/* Modal: Thêm / Sửa Chức năng trên Hub */}
      {cardEditor && (
        <div className="ar-settings-modal-backdrop" onClick={() => setCardEditor(null)}>
          <form
            className="ar-settings-modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveCardEditor}
          >
            <div className="ar-modal-header">
              <div className="ar-modal-header-left">
                <div className={`ar-modal-header-icon ${cardEditor.card.iconBg}`}>
                  <Settings2 />
                </div>
                <div>
                  <h2 className="ar-modal-header-title">
                    {cardEditor.mode === 'add'
                      ? 'Thêm chức năng cài đặt mới'
                      : 'Chỉnh sửa chức năng cài đặt'}
                  </h2>
                  <p className="ar-modal-header-subtitle">
                    Tùy chỉnh tên, mô tả, nhóm danh mục và màu sắc biểu tượng
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="ar-modal-close-btn"
                onClick={() => setCardEditor(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="ar-modal-body">
              <div className="ar-form-grid">
                <div className="ar-field ar-form-grid-full">
                  <label>Nhóm danh mục *</label>
                  <select
                    value={cardEditor.groupId}
                    onChange={(e) =>
                      setCardEditor({ ...cardEditor, groupId: e.target.value })
                    }
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                    <option value="__new__">+ Tạo nhóm danh mục mới...</option>
                  </select>
                </div>

                {cardEditor.groupId === '__new__' && (
                  <div className="ar-field ar-form-grid-full">
                    <label>Tên nhóm danh mục mới *</label>
                    <input
                      required
                      placeholder="VD: Quản lý Chuỗi & Chi nhánh"
                      value={cardEditor.newGroupTitle || ''}
                      onChange={(e) =>
                        setCardEditor({ ...cardEditor, newGroupTitle: e.target.value })
                      }
                    />
                  </div>
                )}

                <div className="ar-field ar-form-grid-full">
                  <label>Tên chức năng *</label>
                  <input
                    required
                    placeholder="VD: Cấu hình Tủ Gậy (Locker)"
                    value={cardEditor.card.title}
                    onChange={(e) =>
                      setCardEditor({
                        ...cardEditor,
                        card: { ...cardEditor.card, title: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="ar-field ar-form-grid-full">
                  <label>Mô tả ngắn (Subtitle) *</label>
                  <input
                    required
                    placeholder="VD: Quản lý số tủ, phí thuê tháng và hạn sử dụng"
                    value={cardEditor.card.subtitle}
                    onChange={(e) =>
                      setCardEditor({
                        ...cardEditor,
                        card: { ...cardEditor.card, subtitle: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="ar-field">
                  <label>Biểu tượng</label>
                  <select
                    value={cardEditor.card.iconName}
                    onChange={(e) =>
                      setCardEditor({
                        ...cardEditor,
                        card: { ...cardEditor.card, iconName: e.target.value },
                      })
                    }
                  >
                    <option value="Settings2">Bánh răng (Cấu hình)</option>
                    <option value="Store">Cửa hàng / Cơ sở</option>
                    <option value="Flag">Cờ Golf / Line</option>
                    <option value="Clock">Đồng hồ / Giờ</option>
                    <option value="Coins">Tiền tệ / Bảng giá</option>
                    <option value="Crown">Vương miện / VIP</option>
                    <option value="Percent">Ưu đãi / Voucher</option>
                    <option value="Coffee">Đồ uống / F&B</option>
                    <option value="Box">Kho hàng</option>
                    <option value="Users">Khách hàng / Nhân sự</option>
                    <option value="Trophy">Cúp Giải đấu</option>
                    <option value="GraduationCap">Học viện / HLV</option>
                    <option value="CreditCard">Thẻ / Thanh toán</option>
                    <option value="ShieldCheck">Bảo mật</option>
                  </select>
                </div>

                <div className="ar-field">
                  <label>Màu sắc biểu tượng</label>
                  <select
                    value={cardEditor.card.iconBg}
                    onChange={(e) =>
                      setCardEditor({
                        ...cardEditor,
                        card: { ...cardEditor.card, iconBg: e.target.value },
                      })
                    }
                  >
                    <option value="ar-icon-emerald">Xanh lá (Emerald)</option>
                    <option value="ar-icon-blue">Xanh dương (Blue)</option>
                    <option value="ar-icon-amber">Vàng cam (Amber)</option>
                    <option value="ar-icon-purple">Tím (Purple)</option>
                    <option value="ar-icon-pink">Hồng (Pink)</option>
                    <option value="ar-icon-sky">Xanh da trời (Sky)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="ar-modal-footer">
              <button
                type="button"
                className="ar-btn-secondary"
                onClick={() => setCardEditor(null)}
              >
                Hủy
              </button>
              <button type="submit" className="ar-btn-primary">
                <Save size={16} />
                {cardEditor.mode === 'add' ? 'Thêm chức năng' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="ar-settings-toast">
          <Check />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Interactive Modals for all 28+ Cards with Full Add/Edit/Delete inside */}
      {openCard && (
        <SettingsCardModal
          card={openCard}
          config={draftConfig}
          data={data}
          busy={busy}
          onClose={() => setOpenCard(null)}
          onSave={handleSaveConfig}
          onSyncTable={handleSyncTable}
          onShowToast={showToast}
          onGo={onGo}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// =============================================================================
// Database-backed Menu & Service Catalog Manager (Single Source of Truth: /api/fnb)
// =============================================================================
function DatabaseMenuCrudManager({
  mode,
  onNotify,
  onChanged,
}: {
  mode: 'fnb' | 'service';
  onNotify: (msg: string) => void;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | 'new' | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: (mode === 'fnb' ? 'drink' : 'other') as 'drink' | 'food' | 'other',
    unit: mode === 'fnb' ? 'ly' : 'buổi',
    price: 50000,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fnb', { cache: 'no-store' });
      const d = (await r.json()) as { menu?: MenuItem[] };
      if (d.menu) setItems(d.menu);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadMenu();
    });
  }, []);

  const filtered = useMemo(() => {
    return items.filter((m) =>
      mode === 'fnb' ? m.category === 'drink' || m.category === 'food' : m.category === 'other',
    );
  }, [items, mode]);

  const startAdd = () => {
    setForm({
      name: '',
      category: mode === 'fnb' ? 'drink' : 'other',
      unit: mode === 'fnb' ? 'ly' : 'buổi',
      price: mode === 'fnb' ? 45000 : 150000,
      active: true,
    });
    setEditingItem('new');
  };

  const startEdit = (m: MenuItem) => {
    setForm({
      name: m.name,
      category: m.category,
      unit: m.unit,
      price: m.price,
      active: !!m.active,
    });
    setEditingItem(m);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price <= 0) {
      onNotify('Vui lòng nhập tên và đơn giá hợp lệ (> 0₫)');
      return;
    }
    setSaving(true);
    try {
      const payload =
        editingItem === 'new'
          ? {
              action: 'item-create',
              requestId: operationKey(),
              name: form.name.trim(),
              category: form.category,
              unit: form.unit.trim() || (mode === 'fnb' ? 'phần' : 'lượt'),
              price: Math.round(Number(form.price)),
              feeBps: 0,
              vatBps: 0,
              active: form.active,
            }
          : {
              action: 'item-update',
              id: (editingItem as MenuItem).id,
              expectedVersion: (editingItem as MenuItem).version,
              name: form.name.trim(),
              category: form.category,
              unit: form.unit.trim() || (mode === 'fnb' ? 'phần' : 'lượt'),
              price: Math.round(Number(form.price)),
              feeBps: (editingItem as MenuItem).fee_bps ?? 0,
              vatBps: (editingItem as MenuItem).vat_bps ?? 0,
              active: form.active,
            };
      const r = await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = (await r.json()) as { error?: string };
      if (!r.ok) {
        onNotify(res.error || 'Không lưu được mục');
        return;
      }
      await loadMenu();
      setEditingItem(null);
      onChanged?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
      }
      onNotify(
        editingItem === 'new'
          ? 'Đã thêm mới và đồng bộ sang POS & Thực đơn!'
          : 'Đã cập nhật và đồng bộ sang POS & Thực đơn!',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: MenuItem) => {
    setSaving(true);
    try {
      const r = await fetch('/api/fnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'item-delete', id: m.id }),
      });
      if (r.ok) {
        await loadMenu();
        onChanged?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
        }
        onNotify(`Đã xóa/ngừng kinh doanh "${m.name}" trên toàn hệ thống!`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          {mode === 'fnb'
            ? 'Đồng bộ trực tiếp với POS (Desktop & Mobile) và Phân hệ Thực đơn & Kho (menu_items).'
            : 'Đồng bộ trực tiếp bảng giá Thuê gậy, Caddie, Giày tập và Phụ kiện với màn hình POS.'}
        </p>
        <button type="button" className="ar-btn-primary" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={startAdd}>
          <Plus size={15} /> Thêm mới
        </button>
      </div>

      {editingItem !== null && (
        <div className="ar-crud-inline-box">
          <div className="ar-form-grid" style={{ marginBottom: 10 }}>
            <div className="ar-field">
              <label>{mode === 'fnb' ? 'Tên món / đồ uống' : 'Tên dịch vụ / phụ kiện'}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={mode === 'fnb' ? 'VD: Cà phê sữa đá' : 'VD: Thuê bộ gậy TaylorMade'}
              />
            </div>
            {mode === 'fnb' && (
              <div className="ar-field">
                <label>Phân nhóm</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as 'drink' | 'food' })}
                >
                  <option value="drink">Đồ uống</option>
                  <option value="food">Đồ ăn / Combo</option>
                </select>
              </div>
            )}
            <div className="ar-field">
              <label>Đơn vị tính</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder={mode === 'fnb' ? 'ly / chai / phần' : 'buổi / giờ / hộp'}
              />
            </div>
            <div className="ar-field">
              <label>Đơn giá bán (VNĐ)</label>
              <input
                type="number"
                step="5000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="ar-field">
              <label>Trạng thái kinh doanh</label>
              <select
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}
              >
                <option value="1">Đang bán (Còn hàng)</option>
                <option value="0">Tạm ngưng (Hết hàng)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ar-btn-secondary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setEditingItem(null)}>
              Hủy
            </button>
            <button type="button" className="ar-btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }} disabled={saving} onClick={handleSave}>
              <Check size={14} /> {editingItem === 'new' ? 'Lưu & Đồng bộ POS' : 'Cập nhật & Đồng bộ POS'}
            </button>
          </div>
        </div>
      )}

      <table className="ar-modal-table">
        <thead>
          <tr>
            <th>{mode === 'fnb' ? 'Tên món / đồ uống' : 'Tên dịch vụ / phụ kiện'}</th>
            <th>Phân loại</th>
            <th>Đơn vị</th>
            <th>Đơn giá</th>
            <th>Trạng thái</th>
            <th style={{ width: 92, textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.name}</strong></td>
              <td>{m.category === 'drink' ? 'Đồ uống' : m.category === 'food' ? 'Đồ ăn' : 'Dịch vụ / Phụ kiện'}</td>
              <td>{m.unit}</td>
              <td><strong>{money(m.price)}</strong></td>
              <td>
                <span className={`ar-status-badge ${m.active ? 'ar-badge-success' : 'ar-badge-warning'}`}>
                  {m.active ? 'Đang bán' : 'Tạm ngưng'}
                </span>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button type="button" className="ar-table-icon-btn edit" title="Sửa" onClick={() => startEdit(m)}>
                  <Edit3 size={14} />
                </button>
                <button type="button" className="ar-table-icon-btn delete" title="Xóa" onClick={() => handleDelete(m)}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                Chưa có mục nào. Bấm &ldquo;+ Thêm mới&rdquo; để khởi tạo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Database-backed Rooms & Maintenance Manager (Single Source of Truth: /api/club)
// =============================================================================
function DatabaseRoomsManager({
  data,
  onNotify,
  onChanged,
}: {
  data: Data | null;
  onNotify: (msg: string) => void;
  onChanged?: () => void;
}) {
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const maintList = data?.maintenance ?? [];

  const toggleMaintenance = async (roomId: string, currentlyMaint: boolean) => {
    setBusyRoom(roomId);
    try {
      const r = await fetch('/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'maintenance',
          room: roomId,
          value: { on: !currentlyMaint, reason: !currentlyMaint ? 'Bảo trì kỹ thuật từ Cài đặt' : '' },
        }),
      });
      const res = (await r.json()) as { error?: string };
      if (!r.ok) {
        onNotify(res.error || 'Không đổi được trạng thái line');
        return;
      }
      onChanged?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sigolf:data-sync'));
      }
      onNotify(
        !currentlyMaint
          ? `Đã chuyển ${roomId.toUpperCase()} sang trạng thái Bảo trì trên POS & Đặt sân!`
          : `Đã mở lại ${roomId.toUpperCase()} sẵn sàng đón khách!`,
      );
    } finally {
      setBusyRoom(null);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        Danh sách 10 Line tiêu chuẩn và 2 Phòng VIP đồng bộ trực tiếp với sơ đồ POS và Lịch đặt sân. Bấm nút trạng thái để bật/tắt chế độ Bảo trì thời gian thực.
      </p>
      <table className="ar-modal-table">
        <thead>
          <tr>
            <th>Mã Line</th>
            <th>Tên hiển thị</th>
            <th>Hạng phòng</th>
            <th>Tay thuận</th>
            <th>Trạng thái vận hành</th>
            <th style={{ textAlign: 'right' }}>Điều khiển bảo trì</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((rm) => {
            const maint = maintList.find((m) => m.room === rm.id);
            const isMaint = !!maint;
            return (
              <tr key={rm.id}>
                <td><code>{rm.id}</code></td>
                <td><strong>{rm.name}</strong></td>
                <td>
                  <span className={`ar-status-badge ${rm.vip ? 'ar-badge-warning' : 'ar-badge-info'}`}>
                    {rm.vip ? 'Phòng VIP' : 'Line Tiêu chuẩn'}
                  </span>
                </td>
                <td>{rm.left || rm.vip ? 'Phải & Trái' : 'Tay phải'}</td>
                <td>
                  <span className={`ar-status-badge ${isMaint ? 'ar-badge-warning' : 'ar-badge-success'}`}>
                    {isMaint ? `Đang bảo trì${maint?.reason ? ` (${maint.reason})` : ''}` : 'Sẵn sàng hoạt động'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="ar-btn-secondary"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    disabled={busyRoom === rm.id}
                    onClick={() => toggleMaintenance(rm.id, isMaint)}
                  >
                    {isMaint ? 'Mở hoạt động lại' : 'Chuyển sang Bảo trì'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Universal CRUD Table Manager inside Settings Modals (Persists to SQLite config.customTables)
// =============================================================================
interface CrudColumn {
  key: string;
  label: string;
  placeholder?: string;
  badge?: 'success' | 'info' | 'warning';
}

function EditableCrudList({
  storageKey,
  description,
  columns,
  initialRows,
  savedRows,
  onSyncTable,
  onNotify,
}: {
  storageKey: string;
  description: string;
  columns: CrudColumn[];
  initialRows: Record<string, string>[];
  savedRows?: Record<string, string>[];
  onSyncTable?: (key: string, nextRows: Record<string, string>[]) => Promise<void> | void;
  onNotify: (msg: string) => void;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(() => {
    if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) return savedRows;
    if (typeof window === 'undefined') return initialRows;
    try {
      const raw = window.localStorage.getItem('sigolf_crud_' + storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return initialRows;
  });

  const [editingIndex, setEditingIndex] = useState<number | 'new' | null>(null);
  const [draftRow, setDraftRow] = useState<Record<string, string>>({});

  const persist = (next: Record<string, string>[]) => {
    setRows(next);
    try {
      window.localStorage.setItem('sigolf_crud_' + storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    onSyncTable?.(storageKey, next);
  };

  const startAdd = () => {
    const empty: Record<string, string> = {};
    columns.forEach((c) => {
      empty[c.key] = '';
    });
    setDraftRow(empty);
    setEditingIndex('new');
  };

  const startEdit = (idx: number) => {
    setDraftRow({ ...rows[idx] });
    setEditingIndex(idx);
  };

  const handleSaveRow = () => {
    const firstKey = columns[0]?.key;
    if (firstKey && !draftRow[firstKey]?.trim()) {
      onNotify(`Vui lòng nhập ${columns[0].label}!`);
      return;
    }
    if (editingIndex === 'new') {
      persist([...rows, draftRow]);
      onNotify('Đã thêm mục mới thành công!');
    } else if (typeof editingIndex === 'number') {
      persist(rows.map((r, i) => (i === editingIndex ? draftRow : r)));
      onNotify('Đã cập nhật thông tin!');
    }
    setEditingIndex(null);
  };

  const handleDeleteRow = (idx: number) => {
    persist(rows.filter((_, i) => i !== idx));
    onNotify('Đã xóa mục khỏi danh sách!');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{description}</p>
        <button type="button" className="ar-btn-primary" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={startAdd}>
          <Plus size={15} /> Thêm mới
        </button>
      </div>

      {editingIndex !== null && (
        <div className="ar-crud-inline-box">
          <div className="ar-form-grid" style={{ marginBottom: 10 }}>
            {columns.map((col) => (
              <div key={col.key} className="ar-field" style={{ marginBottom: 4 }}>
                <label>{col.label}</label>
                <input
                  placeholder={col.placeholder || col.label}
                  value={draftRow[col.key] || ''}
                  onChange={(e) => setDraftRow({ ...draftRow, [col.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="ar-btn-secondary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setEditingIndex(null)}>
              Hủy
            </button>
            <button type="button" className="ar-btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={handleSaveRow}>
              <Check size={14} /> {editingIndex === 'new' ? 'Thêm vào danh sách' : 'Lưu cập nhật'}
            </button>
          </div>
        </div>
      )}

      <table className="ar-modal-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th style={{ width: 92, textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((col, cIdx) => (
                <td key={col.key}>
                  {cIdx === 0 ? (
                    <strong>{r[col.key]}</strong>
                  ) : col.badge ? (
                    <span className={`ar-status-badge ar-badge-${col.badge}`}>{r[col.key]}</span>
                  ) : (
                    r[col.key]
                  )}
                </td>
              ))}
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  className="ar-table-icon-btn edit"
                  title="Sửa"
                  onClick={() => startEdit(i)}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="ar-table-icon-btn delete"
                  title="Xóa"
                  onClick={() => handleDeleteRow(i)}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                Chưa có dữ liệu. Bấm &ldquo;+ Thêm mới&rdquo; để khởi tạo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Interactive Modal Engine covering all 28+ settings cards
// -----------------------------------------------------------------------------
function SettingsCardModal({
  card,
  config,
  data,
  busy,
  onClose,
  onSave,
  onSyncTable,
  onShowToast,
  onGo,
  onChanged,
}: {
  card: CardDef;
  config: Config;
  data: Data | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Config>) => Promise<void> | void;
  onSyncTable?: (key: string, nextRows: Record<string, string>[]) => Promise<void> | void;
  onShowToast: (msg: string) => void;
  onGo?: (v: string) => void;
  onChanged?: () => void;
}) {
  const cardId = card.id;
  // Local states per modal type (initialized from Single Source of Truth `config`)
  const [formFacility, setFormFacility] = useState({
    name: config.name || '',
    address: config.address || '',
    hotline: config.hotline || '0877834888',
    email: config.email || 'contact@sigolf.vn',
    website: config.website || 'https://sigolf.vn',
    logo: config.logo || '/logo.webp',
  });

  const [formHours, setFormHours] = useState({
    open: config.open || '06:00',
    close: config.close || '23:00',
    clean: config.clean || 10,
    vipClean: config.vipClean || 15,
    grace: config.grace || 15,
    buffer: config.buffer || 5,
    holidays: [...(config.holidays || [])],
  });

  const [newHoliday, setNewHoliday] = useState('');

  const [formBookingRules, setFormBookingRules] = useState({
    days: config.days || 14,
    cancelHours: config.cancelHours || 2,
    depositPercent: config.depositPercent ?? 30,
    autoCancelGrace: config.autoCancelGrace ?? 15,
    onlineEnabled: !!config.onlineEnabled,
    onlineSlug: config.onlineSlug || 'sigolf-club',
  });

  const [formPrices, setFormPrices] = useState(() => {
    const rules = config.priceRules ?? [];
    const stdNormal = rules.find((r) => r.service === 'gdr' && r.room === 'standard' && r.day === 'weekday' && r.from === '11:00')?.amount;
    const stdHappy = rules.find((r) => r.service === 'gdr' && r.room === 'standard' && r.day === 'weekday' && r.to === '11:00')?.amount;
    const vipNormal = rules.find((r) => r.service === 'gdr' && r.room === 'vip' && r.day === 'weekday' && r.from === '11:00')?.amount;
    const vipHappyRule = rules.find((r) => r.service === 'gdr' && r.room === 'vip' && r.day === 'weekday' && r.to === '11:00')?.amount;
    return {
      rate: stdNormal ?? config.rate ?? 150000,
      happy: stdHappy ?? config.happy ?? 100000,
      vipRate: vipNormal ?? config.vipRate ?? 200000,
      vipHappy: vipHappyRule ?? config.vipHappy ?? 150000,
    };
  });

  const [formPayment, setFormPayment] = useState({
    bankBin: config.bankBin || '970422',
    bankAccount: config.bankAccount || '0877834888',
    bankHolder: config.bankHolder || 'SAIGON INDOOR GOLF CLUB',
  });

  const [formTax, setFormTax] = useState({
    vat: config.vat ?? 8,
    fee: config.fee ?? 5,
    feeMode: config.feeMode || 'percent',
    invoiceHeader: config.invoiceHeader || 'CÔNG TY TNHH SAIGON INDOOR GOLF',
    taxCode: config.taxCode || '0318889999',
    invoiceFooterNote: config.invoiceFooterNote || 'Cảm ơn Quý khách & Hẹn gặp lại!',
  });

  const [formMembership, setFormMembership] = useState({
    gold: config.tierThresholds?.gold ?? 20000000,
    platinum: config.tierThresholds?.platinum ?? 50000000,
    diamond: config.tierThresholds?.diamond ?? 100000000,
    benefits: [
      ...(config.memberBenefits ?? [
        'Ưu tiên đặt line giờ cao điểm',
        'Giảm 10% F&B và dịch vụ thuê gậy',
        'Miễn phí 1 giờ chơi vào ngày sinh nhật',
        'Tặng gói caddie 5 buổi/năm',
      ]),
    ],
  });

  const [newBenefit, setNewBenefit] = useState('');
  const [editingBenefitIdx, setEditingBenefitIdx] = useState<number | null>(null);
  const [editingBenefitText, setEditingBenefitText] = useState('');

  // General Config
  const [formGeneral, setFormGeneral] = useState({
    language: config.generalConfig?.language || 'vi',
    currency: config.generalConfig?.currency || 'VND',
    dateFormat: config.generalConfig?.dateFormat || 'DD/MM/YYYY',
    soundAlert: config.generalConfig?.soundAlert ?? true,
    autoRefreshSec: config.generalConfig?.autoRefreshSec ?? 30,
  });

  // Security
  const [formSecurity, setFormSecurity] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Marketing tools
  const [formMarketing, setFormMarketing] = useState({
    fbPixel: config.marketingConfig?.fbPixel || '889218291028',
    ga4Id: config.marketingConfig?.ga4Id || 'G-SIGOLF2026',
    mapsPlaceId: config.marketingConfig?.mapsPlaceId || 'ChIJ...SigolfClub',
    zaloOaId: config.marketingConfig?.zaloOaId || '198273645019',
  });

  // Matchmaking
  const [formMatchmaking, setFormMatchmaking] = useState({
    enabled: config.matchmakingConfig?.enabled ?? true,
    maxHdcDiff: config.matchmakingConfig?.maxHdcDiff ?? 8,
    autoNotifyZalo: config.matchmakingConfig?.autoNotifyZalo ?? true,
  });

  // Tournament
  const [formTournament, setFormTournament] = useState({
    defaultFormat: config.tournamentConfig?.defaultFormat || 'Stroke Play',
    hdcSystem: config.tournamentConfig?.hdcSystem || 'System 36',
    liveLeaderboard: config.tournamentConfig?.liveLeaderboard ?? true,
  });

  // Academy
  const [formAcademy, setFormAcademy] = useState({
    commissionRate: config.academyConfig?.commissionRate ?? 35,
    lessonMinutes: config.academyConfig?.lessonMinutes ?? 60,
    freeTrialAvailable: config.academyConfig?.freeTrialAvailable ?? true,
  });

  // Submitting logic (persisting 100% to SQLite Single Source of Truth)
  const handleSave = async () => {
    if (cardId === 'facility_info') {
      await onSave({
        name: formFacility.name,
        address: formFacility.address,
        hotline: formFacility.hotline,
        email: formFacility.email,
        website: formFacility.website,
        logo: formFacility.logo,
      });
      return;
    }
    if (cardId === 'operating_hours') {
      await onSave({
        open: formHours.open,
        close: formHours.close,
        clean: Number(formHours.clean),
        vipClean: Number(formHours.vipClean),
        grace: Number(formHours.grace),
        buffer: Number(formHours.buffer),
        holidays: formHours.holidays,
      });
      return;
    }
    if (cardId === 'booking_rules') {
      await onSave({
        days: Number(formBookingRules.days),
        cancelHours: Number(formBookingRules.cancelHours),
        depositPercent: Number(formBookingRules.depositPercent),
        autoCancelGrace: Number(formBookingRules.autoCancelGrace),
        onlineEnabled: formBookingRules.onlineEnabled,
        onlineSlug: formBookingRules.onlineSlug,
      });
      return;
    }
    if (cardId === 'pricing_rates') {
      const nextRate = Number(formPrices.rate);
      const nextHappy = Number(formPrices.happy);
      const nextVipRate = Number(formPrices.vipRate);
      const nextVipHappy = Number(formPrices.vipHappy);
      const baseRules = config.priceRules?.length ? config.priceRules : officialPriceRules();
      // Only weekday hourly rules follow these fields; weekend/holiday/per-person prices stay as set.
      const syncedRules = syncRulesWithRates(baseRules, {
        prevOpen: config.open || '06:00',
        prevClose: config.close || '23:00',
        open: config.open || '06:00',
        close: config.close || '23:00',
        rate: nextRate,
        happy: nextHappy,
        vipRate: nextVipRate,
        vipHappy: nextVipHappy,
        ratesTouched: true,
        hoursTouched: false,
      });
      await onSave({
        rate: nextRate,
        happy: nextHappy,
        vipRate: nextVipRate,
        vipHappy: nextVipHappy,
        priceRules: syncedRules,
      });
      return;
    }
    if (cardId === 'payment_methods') {
      await onSave({
        bankBin: formPayment.bankBin,
        bankAccount: formPayment.bankAccount,
        bankHolder: formPayment.bankHolder,
      });
      return;
    }
    if (cardId === 'invoice_tax') {
      await onSave({
        vat: Number(formTax.vat),
        fee: Number(formTax.fee),
        feeMode: formTax.feeMode as 'percent' | 'fixed',
        invoiceHeader: formTax.invoiceHeader,
        taxCode: formTax.taxCode,
        invoiceFooterNote: formTax.invoiceFooterNote,
      });
      return;
    }
    if (cardId === 'membership_tiers') {
      await onSave({
        tierThresholds: {
          gold: Number(formMembership.gold),
          platinum: Number(formMembership.platinum),
          diamond: Number(formMembership.diamond),
        },
        memberBenefits: formMembership.benefits,
      });
      return;
    }
    if (cardId === 'general_config') {
      await onSave({
        generalConfig: formGeneral,
      });
      return;
    }
    if (cardId === 'marketing_tools') {
      await onSave({
        marketingConfig: formMarketing,
      });
      return;
    }
    if (cardId === 'matchmaking') {
      await onSave({
        matchmakingConfig: formMatchmaking,
      });
      return;
    }
    if (cardId === 'tournament_settings') {
      await onSave({
        tournamentConfig: formTournament,
      });
      return;
    }
    if (cardId === 'academy_coaching') {
      await onSave({
        academyConfig: formAcademy,
      });
      return;
    }

    onShowToast('Đã lưu thiết lập thành công!');
    onClose();
  };

  return (
    <div className="ar-settings-modal-backdrop" onClick={onClose}>
      <div
        className="ar-settings-modal"
        style={
          cardId === 'hour_packages' || cardId === 'payment_methods'
            ? { maxWidth: 1060, width: '96%' }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="ar-modal-header">
          <div className="ar-modal-header-left">
            <div className={`ar-modal-header-icon ${card.iconBg || 'ar-icon-emerald'}`}>
              <Settings2 />
            </div>
            <div>
              <h2 className="ar-modal-header-title">{getCardTitle(cardId, card.title)}</h2>
              <p className="ar-modal-header-subtitle">{getCardSubtitle(cardId, card.subtitle)}</p>
            </div>
          </div>
          <button className="ar-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="ar-modal-body">
          {cardId === 'facility_info' && (
            <div className="ar-form-grid">
              <div className="ar-field ar-form-grid-full">
                <label>Tên cơ sở / Câu lạc bộ</label>
                <input
                  value={formFacility.name}
                  onChange={(e) => setFormFacility({ ...formFacility, name: e.target.value })}
                  placeholder="Saigon Indoor Golf Club"
                />
              </div>
              <div className="ar-field ar-form-grid-full">
                <label>Địa chỉ hoạt động</label>
                <input
                  value={formFacility.address}
                  onChange={(e) => setFormFacility({ ...formFacility, address: e.target.value })}
                  placeholder="250 Lương Định Của, Phường Bình Trưng, TP.HCM"
                />
              </div>
              <div className="ar-field">
                <label>Số điện thoại Hotline</label>
                <input
                  value={formFacility.hotline}
                  onChange={(e) => setFormFacility({ ...formFacility, hotline: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Email liên hệ</label>
                <input
                  value={formFacility.email}
                  onChange={(e) => setFormFacility({ ...formFacility, email: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Website chính thức</label>
                <input
                  value={formFacility.website}
                  onChange={(e) => setFormFacility({ ...formFacility, website: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Đường dẫn Logo (URL)</label>
                <input
                  value={formFacility.logo}
                  onChange={(e) => setFormFacility({ ...formFacility, logo: e.target.value })}
                />
              </div>
            </div>
          )}

          {cardId === 'rooms_lines' && (
            <DatabaseRoomsManager
              data={data}
              onNotify={onShowToast}
              onChanged={onChanged}
            />
          )}

          {cardId === 'operating_hours' && (
            <div>
              <div className="ar-form-grid">
                <div className="ar-field">
                  <label>Giờ mở cửa (HH:mm)</label>
                  <input
                    type="time"
                    value={formHours.open}
                    onChange={(e) => setFormHours({ ...formHours, open: e.target.value })}
                  />
                </div>
                <div className="ar-field">
                  <label>Giờ đóng cửa (HH:mm)</label>
                  <input
                    type="time"
                    value={formHours.close}
                    onChange={(e) => setFormHours({ ...formHours, close: e.target.value })}
                  />
                </div>
                <div className="ar-field">
                  <label>Thời gian dọn line thường (phút)</label>
                  <input
                    type="number"
                    value={formHours.clean}
                    onChange={(e) => setFormHours({ ...formHours, clean: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Thời gian dọn phòng VIP (phút)</label>
                  <input
                    type="number"
                    value={formHours.vipClean}
                    onChange={(e) => setFormHours({ ...formHours, vipClean: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Thời gian gia hạn trễ (phút)</label>
                  <input
                    type="number"
                    value={formHours.grace}
                    onChange={(e) => setFormHours({ ...formHours, grace: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Thời gian đệm tối thiểu (phút)</label>
                  <input
                    type="number"
                    value={formHours.buffer}
                    onChange={(e) => setFormHours({ ...formHours, buffer: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Danh sách ngày lễ (Thêm / Xóa ngày áp dụng giá lễ)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="date"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="button"
                    className="ar-btn-secondary"
                    onClick={() => {
                      if (newHoliday && !formHours.holidays.includes(newHoliday)) {
                        setFormHours({
                          ...formHours,
                          holidays: [...formHours.holidays, newHoliday].sort(),
                        });
                        setNewHoliday('');
                      }
                    }}
                  >
                    <Plus size={16} /> Thêm ngày lễ
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {formHours.holidays.map((h) => (
                    <span
                      key={h}
                      style={{
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {h}
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                        onClick={() =>
                          setFormHours({
                            ...formHours,
                            holidays: formHours.holidays.filter((x) => x !== h),
                          })
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cardId === 'facility_layout' && (
            <EditableCrudList
              storageKey="facility_layout_zones"
              savedRows={config.customTables?.facility_layout_zones}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các Khu vực hiển thị trên sơ đồ màn hình POS Bán hàng."
              onNotify={onShowToast}
              columns={[
                { key: 'zone', label: 'Tên khu vực', placeholder: 'VD: Tầng 1 - Khu Standard' },
                { key: 'lines', label: 'Các Line thuộc khu vực', placeholder: 'VD: L1, L2, L3, L4, L5' },
                { key: 'cols', label: 'Bố cục cột POS', placeholder: 'VD: Lưới 5 cột' },
                { key: 'status', label: 'Hiển thị', placeholder: 'Đang bật', badge: 'success' },
              ]}
              initialRows={[
                { zone: 'Tầng 1 - Khu tập Tiêu chuẩn', lines: 'L1, L2, L3, L4, L5, L6, L7, L8, L9, L10', cols: 'Lưới 4 cột', status: 'Đang bật' },
                { zone: 'Tầng 2 - Khu Phòng VIP Private', lines: 'VIP1 (Suite), VIP2 (President)', cols: 'Lưới 2 cột lớn', status: 'Đang bật' },
              ]}
            />
          )}

          {cardId === 'pricing_rates' && (
            <div>
              <div className="ar-form-grid">
                <div className="ar-field">
                  <label>Đơn giá Line thường - Giờ thường (VNĐ/h)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formPrices.rate}
                    onChange={(e) => setFormPrices({ ...formPrices, rate: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Đơn giá Line thường - Giờ vàng (VNĐ/h)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formPrices.happy}
                    onChange={(e) => setFormPrices({ ...formPrices, happy: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Đơn giá Phòng VIP - Giờ thường (VNĐ/h)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formPrices.vipRate}
                    onChange={(e) => setFormPrices({ ...formPrices, vipRate: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Đơn giá Phòng VIP - Giờ vàng (VNĐ/h)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formPrices.vipHappy}
                    onChange={(e) => setFormPrices({ ...formPrices, vipHappy: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {cardId === 'hour_packages' && (
            <PackageCatalogManager
              canAdjust
              onChanged={onChanged}
              onNotify={onShowToast}
            />
          )}

          {cardId === 'membership_tiers' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Cấu hình mốc chi tiêu tích lũy và thêm/sửa/xóa quyền lợi nâng hạng hội viên.
              </p>
              <div className="ar-form-grid">
                <div className="ar-field">
                  <label>Mốc tích lũy hạng Gold (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formMembership.gold}
                    onChange={(e) => setFormMembership({ ...formMembership, gold: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field">
                  <label>Mốc tích lũy hạng Platinum (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formMembership.platinum}
                    onChange={(e) =>
                      setFormMembership({ ...formMembership, platinum: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="ar-field ar-form-grid-full">
                  <label>Mốc tích lũy hạng Diamond (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formMembership.diamond}
                    onChange={(e) =>
                      setFormMembership({ ...formMembership, diamond: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Đặc quyền hội viên (Thêm / Sửa / Xóa)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Nhập quyền lợi mới..."
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      flex: 1,
                    }}
                  />
                  <button
                    type="button"
                    className="ar-btn-secondary"
                    onClick={() => {
                      if (newBenefit.trim()) {
                        setFormMembership({
                          ...formMembership,
                          benefits: [...formMembership.benefits, newBenefit.trim()],
                        });
                        setNewBenefit('');
                      }
                    }}
                  >
                    <Plus size={16} /> Thêm
                  </button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px', fontSize: '13px', color: '#334155' }}>
                  {formMembership.benefits.map((b, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '7px 10px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {editingBenefitIdx === i ? (
                        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                          <input
                            value={editingBenefitText}
                            onChange={(e) => setEditingBenefitText(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              borderRadius: 5,
                              border: '1px solid #cbd5e1',
                            }}
                          />
                          <button
                            type="button"
                            className="ar-btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => {
                              if (editingBenefitText.trim()) {
                                setFormMembership({
                                  ...formMembership,
                                  benefits: formMembership.benefits.map((item, idx) =>
                                    idx === i ? editingBenefitText.trim() : item,
                                  ),
                                });
                              }
                              setEditingBenefitIdx(null);
                            }}
                          >
                            Lưu
                          </button>
                        </div>
                      ) : (
                        <span>• {b}</span>
                      )}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="ar-table-icon-btn edit"
                          onClick={() => {
                            setEditingBenefitIdx(i);
                            setEditingBenefitText(b);
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          className="ar-table-icon-btn delete"
                          onClick={() =>
                            setFormMembership({
                              ...formMembership,
                              benefits: formMembership.benefits.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {cardId === 'promotions_vouchers' && (
            <EditableCrudList
              storageKey="promotions_vouchers"
              savedRows={config.customTables?.promotions_vouchers}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các chương trình khuyến mãi, voucher kích cầu và mã giảm giá (đồng bộ trực tiếp với POS & Bảng giá)."
              onNotify={onShowToast}
              columns={[
                { key: 'code', label: 'Mã Voucher', placeholder: 'VD: GOLFNEW20' },
                { key: 'name', label: 'Tên chương trình', placeholder: 'VD: Ưu đãi khách mới' },
                { key: 'val', label: 'Mức giảm', placeholder: 'VD: Giảm 20%', badge: 'success' },
                { key: 'exp', label: 'Thời hạn', placeholder: 'VD: 31/12/2026' },
                { key: 'st', label: 'Trạng thái', placeholder: 'Đang chạy / Tạm dừng', badge: 'info' },
              ]}
              initialRows={[
                { code: 'GOLFNEW20', name: 'Khách hàng mới trải nghiệm', val: 'Giảm 20%', exp: '31/12/2026', st: 'Đang chạy' },
                { code: 'HAPPYMORNING', name: 'Giờ vàng sáng 6h-11h', val: 'Đồng giá 250k', exp: 'Không giới hạn', st: 'Đang chạy' },
                { code: 'VIPCOMBO', name: 'Combo VIP 2 người', val: 'Giảm 150.000₫', exp: '30/11/2026', st: 'Đang chạy' },
              ]}
            />
          )}

          {cardId === 'fnb_menu' && (
            <div>
              <DatabaseMenuCrudManager
                mode="fnb"
                onNotify={onShowToast}
                onChanged={onChanged}
              />
              <div style={{ marginTop: '14px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="ar-btn-secondary"
                  onClick={() => {
                    onClose();
                    onGo?.('fnb');
                  }}
                >
                  Mở Quản lý F&B Đầy đủ &rarr;
                </button>
              </div>
            </div>
          )}

          {cardId === 'extra_services' && (
            <DatabaseMenuCrudManager
              mode="service"
              onNotify={onShowToast}
              onChanged={onChanged}
            />
          )}

          {cardId === 'inventory_stock' && (
            <EditableCrudList
              storageKey="inventory_stock_rules"
              savedRows={config.customTables?.inventory_stock_rules}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa định mức tồn kho tối thiểu và quy tắc cảnh báo cho các nhóm hàng."
              onNotify={onShowToast}
              columns={[
                { key: 'group', label: 'Nhóm vật tư / Hàng hóa', placeholder: 'VD: Nước đóng chai' },
                { key: 'minQty', label: 'Định mức tối thiểu', placeholder: 'VD: 24 chai' },
                { key: 'autoDeduct', label: 'Tự động trừ kho POS', placeholder: 'Bật / Tắt', badge: 'success' },
                { key: 'warehouse', label: 'Kho lưu trữ', placeholder: 'Kho Quầy Bar Tầng 1' },
              ]}
              initialRows={[
                { group: 'Nước khoáng & Nước giải khát', minQty: '24 chai', autoDeduct: 'Bật', warehouse: 'Kho Quầy Bar Tầng 1' },
                { group: 'Nguyên liệu Pha chế (Hạt cà phê, Sữa)', minQty: '5 kg', autoDeduct: 'Bật', warehouse: 'Kho Bếp Trung tâm' },
                { group: 'Bóng Golf 3D & Phụ kiện cảm biến', minQty: '50 quả', autoDeduct: 'Tắt', warehouse: 'Kho Kỹ thuật' },
              ]}
            />
          )}

          {cardId === 'suppliers_vendor' && (
            <EditableCrudList
              storageKey="suppliers_vendor"
              savedRows={config.customTables?.suppliers_vendor}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa danh sách nhà cung cấp đồ uống, thực phẩm và trang thiết bị sân tập 3D."
              onNotify={onShowToast}
              columns={[
                { key: 'name', label: 'Nhà cung cấp', placeholder: 'VD: Công ty Tân Hiệp' },
                { key: 'item', label: 'Mặt hàng cung ứng', placeholder: 'VD: Nước khoáng, trà' },
                { key: 'phone', label: 'Hotline liên hệ', placeholder: 'VD: 0903112233' },
                { key: 'debt', label: 'Công nợ hiện tại', placeholder: 'VD: 0₫', badge: 'warning' },
              ]}
              initialRows={[
                { name: 'Công ty Nước Giải Khát Tân Hiệp', item: 'Nước khoáng, Nước tăng lực', phone: '0903112233', debt: '2.500.000₫' },
                { name: 'Foresight Golf Việt Nam', item: 'Sensor, Bóng golf chuyên dụng', phone: '0918776655', debt: '0₫' },
                { name: 'Xưởng Cà Phê Cầu Đất', item: 'Hạt Arabica & Robusta rang mộc', phone: '0988445566', debt: '1.200.000₫' },
              ]}
            />
          )}

          {cardId === 'crm_lead_sources' && (
            <EditableCrudList
              storageKey="crm_lead_sources"
              savedRows={config.customTables?.crm_lead_sources}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các kênh thu thập khách hàng tiềm năng (Lead Sources) cho CRM."
              onNotify={onShowToast}
              columns={[
                { key: 'source', label: 'Tên nguồn Lead', placeholder: 'VD: TikTok Golf Channel' },
                { key: 'channel', label: 'Loại kênh', placeholder: 'Online / Offline / Referral' },
                { key: 'autoAssign', label: 'Phân bổ Sale', placeholder: 'Chia vòng tròn (Round-robin)' },
                { key: 'status', label: 'Trạng thái', placeholder: 'Đang bật', badge: 'success' },
              ]}
              initialRows={[
                { source: 'Website Đặt sân trực tuyến', channel: 'Online', autoAssign: 'Tự động (Round-robin)', status: 'Đang bật' },
                { source: 'Fanpage Facebook / Messenger', channel: 'Social', autoAssign: 'Tự động (Round-robin)', status: 'Đang bật' },
                { source: 'Zalo Official Account (OA)', channel: 'Social', autoAssign: 'CSKH Trực ca', status: 'Đang bật' },
                { source: 'Khách vãng lai đến trực tiếp (Walk-in)', channel: 'Offline', autoAssign: 'Lễ tân quầy', status: 'Đang bật' },
                { source: 'Hội viên giới thiệu (Referral)', channel: 'Referral', autoAssign: 'Chuyên viên VIP', status: 'Đang bật' },
              ]}
            />
          )}

          {cardId === 'crm_pipeline' && (
            <EditableCrudList
              storageKey="crm_pipeline"
              savedRows={config.customTables?.crm_pipeline}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các giai đoạn trong Pipeline bán hàng CRM từ Lead mới đến Chốt thành công."
              onNotify={onShowToast}
              columns={[
                { key: 'step', label: 'Thứ tự & Tên giai đoạn', placeholder: 'VD: 1. Lead Mới' },
                { key: 'desc', label: 'Quy trình xử lý chuẩn', placeholder: 'Mô tả hành động của Sale/CSKH' },
                { key: 'sla', label: 'Cam kết SLA', placeholder: 'VD: Phản hồi trong 15 phút', badge: 'info' },
              ]}
              initialRows={[
                { step: '1. Mới tiếp cận', desc: 'Khách để lại thông tin hoặc đặt lịch trực tuyến', sla: '15 phút' },
                { step: '2. Đã tư vấn', desc: 'Nhân viên CSKH gọi xác nhận nhu cầu và báo giá', sla: '2 giờ' },
                { step: '3. Trải nghiệm sân', desc: 'Khách đến chơi thử buổi đầu tiên tại CLB', sla: '3 ngày' },
                { step: '4. Báo giá', desc: 'Gửi đề xuất gói giờ 25h/50h/100h hoặc thẻ VIP', sla: '24 giờ' },
                { step: '5. Chốt thành công', desc: 'Khách thanh toán gói giờ hoặc mở thẻ hội viên', sla: 'Hoàn tất' },
              ]}
            />
          )}

          {cardId === 'crm_automation' && (
            <EditableCrudList
              storageKey="crm_automation"
              savedRows={config.customTables?.crm_automation}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các kịch bản tự động gửi tin nhắn chăm sóc khách qua Zalo ZNS / SMS / Email."
              onNotify={onShowToast}
              columns={[
                { key: 'name', label: 'Tên kịch bản', placeholder: 'VD: Nhắc lịch chơi trước 2h' },
                { key: 'trigger', label: 'Sự kiện kích hoạt', placeholder: 'VD: Trước giờ đặt sân 120 phút' },
                { key: 'channel', label: 'Kênh gửi', placeholder: 'Zalo ZNS / SMS / Email', badge: 'info' },
                { key: 'status', label: 'Trạng thái', placeholder: 'Đang chạy', badge: 'success' },
              ]}
              initialRows={[
                { name: 'Xác nhận đặt sân tức thì', trigger: 'Ngay khi tạo Booking', channel: 'Zalo ZNS', status: 'Đang chạy' },
                { name: 'Nhắc lịch hẹn trước giờ chơi', trigger: 'Trước giờ chơi 2 tiếng', channel: 'Zalo ZNS & SMS', status: 'Đang chạy' },
                { name: 'Chúc mừng sinh nhật + Tặng 1h chơi', trigger: '08:00 sáng ngày sinh nhật', channel: 'Zalo OA & Email', status: 'Đang chạy' },
                { name: 'Nhắc gia hạn thẻ hội viên sắp hết hạn', trigger: 'Trước ngày hết hạn 7 ngày', channel: 'Zalo OA & Gọi điện', status: 'Đang chạy' },
              ]}
            />
          )}

          {cardId === 'crm_tags' && (
            <EditableCrudList
              storageKey="crm_tags"
              savedRows={config.customTables?.crm_tags}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các nhóm phân loại và thẻ Tag khách hàng trong CRM."
              onNotify={onShowToast}
              columns={[
                { key: 'tag', label: 'Tên thẻ Tag / Phân nhóm', placeholder: 'VD: Golfer thường xuyên' },
                { key: 'group', label: 'Nhóm đối tượng', placeholder: 'VD: Hội viên / VIP / Học viên' },
                { key: 'perk', label: 'Chính sách chăm sóc', placeholder: 'VD: Ưu tiên giữ Line VIP', badge: 'success' },
              ]}
              initialRows={[
                { tag: 'Golfer thường xuyên', group: 'Hội viên', perk: 'Ưu tiên đặt sân cuối tuần' },
                { tag: 'Quan tâm huấn luyện', group: 'Học viên Academy', perk: 'Tặng buổi kiểm tra Swing' },
                { tag: 'Thích thi đấu', group: 'Tournament', perk: 'Mời tham dự giải CLB hàng tháng' },
                { tag: 'Nhóm doanh nhân', group: 'Khách VIP / Doanh nghiệp', perk: 'Phục vụ phòng VIP & Xì gà' },
                { tag: 'Golfer Tay Trái', group: 'Đặc thù kỹ thuật', perk: 'Ưu tiên xếp Line 10 / Phòng VIP' },
              ]}
            />
          )}

          {cardId === 'booking_rules' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Cho phép đặt trước tối đa (ngày)</label>
                <input
                  type="number"
                  value={formBookingRules.days}
                  onChange={(e) =>
                    setFormBookingRules({ ...formBookingRules, days: Number(e.target.value) })
                  }
                />
              </div>
              <div className="ar-field">
                <label>Hạn hủy lịch trước (giờ)</label>
                <input
                  type="number"
                  value={formBookingRules.cancelHours}
                  onChange={(e) =>
                    setFormBookingRules({ ...formBookingRules, cancelHours: Number(e.target.value) })
                  }
                />
              </div>
              <div className="ar-field">
                <label>Tỷ lệ tiền cọc giữ sân (%)</label>
                <input
                  type="number"
                  value={formBookingRules.depositPercent}
                  onChange={(e) =>
                    setFormBookingRules({
                      ...formBookingRules,
                      depositPercent: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="ar-field">
                <label>Thời gian giữ chỗ khi đến trễ (phút)</label>
                <input
                  type="number"
                  value={formBookingRules.autoCancelGrace}
                  onChange={(e) =>
                    setFormBookingRules({
                      ...formBookingRules,
                      autoCancelGrace: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="ar-field ar-form-grid-full">
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Bật trang nhận đặt lịch trực tuyến cho khách (Online Booking)</strong>
                    <small>Khách có thể tự chọn line và khung giờ trên website</small>
                  </div>
                  <label className="ar-switch">
                    <input
                      type="checkbox"
                      checked={formBookingRules.onlineEnabled}
                      onChange={(e) =>
                        setFormBookingRules({
                          ...formBookingRules,
                          onlineEnabled: e.target.checked,
                        })
                      }
                    />
                    <span className="ar-slider" />
                  </label>
                </div>
              </div>
              <div className="ar-field ar-form-grid-full">
                <label>Đường dẫn trang đặt lịch trực tuyến</label>
                <input
                  value={formBookingRules.onlineSlug}
                  onChange={(e) =>
                    setFormBookingRules({ ...formBookingRules, onlineSlug: e.target.value })
                  }
                  placeholder="sigolf-club"
                />
                <small>Khách truy cập tại: https://sigolf.vn/book/{formBookingRules.onlineSlug}</small>
              </div>
            </div>
          )}

          {cardId === 'tournament_settings' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Thể thức thi đấu mặc định</label>
                <select
                  value={formTournament.defaultFormat}
                  onChange={(e) =>
                    setFormTournament({ ...formTournament, defaultFormat: e.target.value })
                  }
                >
                  <option value="Stroke Play">Đấu gậy cá nhân (Stroke Play)</option>
                  <option value="Match Play">Đấu đối kháng (Match Play)</option>
                  <option value="Scramble">Đồng đội 2-4 người (Scramble)</option>
                  <option value="Stableford">Tính điểm Stableford</option>
                </select>
              </div>
              <div className="ar-field">
                <label>Phương pháp tính Handicap giải</label>
                <select
                  value={formTournament.hdcSystem}
                  onChange={(e) =>
                    setFormTournament({ ...formTournament, hdcSystem: e.target.value })
                  }
                >
                  <option value="System 36">Hệ thống tính System 36 trong ngày</option>
                  <option value="Callaway">Công thức Callaway</option>
                  <option value="Official VGA">Handicap chính thức Vhandicap</option>
                </select>
              </div>
              <div className="ar-field ar-form-grid-full">
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Hiển thị bảng điểm trực tiếp trên màn hình LED (Live Leaderboard)</strong>
                    <small>Tự động cập nhật xếp hạng thời gian thực khi từng line hoàn tất hố</small>
                  </div>
                  <label className="ar-switch">
                    <input
                      type="checkbox"
                      checked={formTournament.liveLeaderboard}
                      onChange={(e) =>
                        setFormTournament({ ...formTournament, liveLeaderboard: e.target.checked })
                      }
                    />
                    <span className="ar-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {cardId === 'academy_coaching' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Tỷ lệ chia sẻ doanh thu cho HLV (%)</label>
                <input
                  type="number"
                  value={formAcademy.commissionRate}
                  onChange={(e) =>
                    setFormAcademy({ ...formAcademy, commissionRate: Number(e.target.value) })
                  }
                />
              </div>
              <div className="ar-field">
                <label>Thời lượng 1 buổi học tiêu chuẩn (phút)</label>
                <input
                  type="number"
                  value={formAcademy.lessonMinutes}
                  onChange={(e) =>
                    setFormAcademy({ ...formAcademy, lessonMinutes: Number(e.target.value) })
                  }
                />
              </div>
              <div className="ar-field ar-form-grid-full">
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Cung cấp buổi test swing miễn phí cho học viên mới</strong>
                    <small>Học viên được kiểm tra dáng swing 20 phút trước khi đăng ký khóa học</small>
                  </div>
                  <label className="ar-switch">
                    <input
                      type="checkbox"
                      checked={formAcademy.freeTrialAvailable}
                      onChange={(e) =>
                        setFormAcademy({ ...formAcademy, freeTrialAvailable: e.target.checked })
                      }
                    />
                    <span className="ar-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {cardId === 'matchmaking' && (
            <div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Bật tính năng &ldquo;Tìm bạn chơi&rdquo; (Golf Matchmaking)</strong>
                  <small>Cho phép người chơi đăng tìm bạn đồng hành cùng khung giờ hoặc cùng trình độ HDC</small>
                </div>
                <label className="ar-switch">
                  <input
                    type="checkbox"
                    checked={formMatchmaking.enabled}
                    onChange={(e) =>
                      setFormMatchmaking({ ...formMatchmaking, enabled: e.target.checked })
                    }
                  />
                  <span className="ar-slider" />
                </label>
              </div>
              <div className="ar-form-grid" style={{ marginTop: '14px' }}>
                <div className="ar-field">
                  <label>Chênh lệch Handicap tối đa khi ghép cặp</label>
                  <input
                    type="number"
                    value={formMatchmaking.maxHdcDiff}
                    onChange={(e) =>
                      setFormMatchmaking({
                        ...formMatchmaking,
                        maxHdcDiff: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="ar-field">
                  <label>Tự động thông báo qua Zalo khi có người tìm ghép</label>
                  <select
                    value={formMatchmaking.autoNotifyZalo ? 'yes' : 'no'}
                    onChange={(e) =>
                      setFormMatchmaking({
                        ...formMatchmaking,
                        autoNotifyZalo: e.target.value === 'yes',
                      })
                    }
                  >
                    <option value="yes">Bật thông báo Zalo</option>
                    <option value="no">Chỉ hiển thị trên App</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {cardId === 'payment_methods' && (
            <div>
              <div className="ar-form-grid">
                <div className="ar-field">
                  <label>Ngân hàng thụ hưởng (Liên kết SePay / NAPAS)</label>
                  <select
                    value={
                      SEPAY_BANKS.some((b) => b.bin === formPayment.bankBin)
                        ? formPayment.bankBin
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setFormPayment({ ...formPayment, bankBin: e.target.value });
                      }
                    }}
                  >
                    {SEPAY_BANKS.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {b.code} · {b.name} (BIN {b.bin})
                      </option>
                    ))}
                    <option value="custom">Ngân hàng khác (Tự nhập BIN)</option>
                  </select>
                </div>
                <div className="ar-field">
                  <label>Mã BIN ngân hàng (6 số)</label>
                  <input
                    value={formPayment.bankBin}
                    onChange={(e) => setFormPayment({ ...formPayment, bankBin: e.target.value })}
                    placeholder="970422 (MB Bank)"
                  />
                </div>
                <div className="ar-field">
                  <label>Số tài khoản thụ hưởng (Đã thêm trên my.sepay.vn)</label>
                  <input
                    value={formPayment.bankAccount}
                    onChange={(e) => setFormPayment({ ...formPayment, bankAccount: e.target.value })}
                    placeholder="0877834888"
                  />
                </div>
                <div className="ar-field">
                  <label>Tên chủ tài khoản (In hoa không dấu)</label>
                  <input
                    value={formPayment.bankHolder}
                    onChange={(e) =>
                      setFormPayment({ ...formPayment, bankHolder: e.target.value.toUpperCase() })
                    }
                    placeholder="SAIGON INDOOR GOLF CLUB"
                  />
                </div>
              </div>

              {formPayment.bankBin && formPayment.bankAccount && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    borderRadius: 5,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      padding: 8,
                      borderRadius: 5,
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <img
                      alt="Mã QR SePay kiểm tra"
                      width={130}
                      height={130}
                      src={sepayQrUrl({
                        bin: formPayment.bankBin,
                        account: formPayment.bankAccount,
                        holder: formPayment.bankHolder || 'SAIGON INDOOR GOLF CLUB',
                        amount: 50000,
                        note: 'SGGTESTQR',
                      })}
                      style={{ display: 'block', borderRadius: 5 }}
                    />
                    <small style={{ fontSize: 10.5, color: '#64748b' }}>QR SePay mẫu (50.000₫)</small>
                  </div>
                  <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
                    <strong style={{ color: '#059669', fontSize: 14, display: 'block', marginBottom: 4 }}>
                      ✓ Đã đồng bộ cấu hình tạo mã QR động SePay (qr.sepay.vn)
                    </strong>
                    <p style={{ margin: '0 0 6px', color: '#334155' }}>
                      Ngân hàng:{' '}
                      <strong>
                        {SEPAY_BANKS.find((b) => b.bin === formPayment.bankBin)?.name ||
                          `BIN ${formPayment.bankBin}`}
                      </strong>{' '}
                      · STK: <code>{formPayment.bankAccount}</code> · Chủ TK:{' '}
                      <strong>{formPayment.bankHolder}</strong>
                    </p>
                    <small style={{ color: '#64748b' }}>
                      Nhớ bấm &ldquo;Lưu thay đổi&rdquo; ở góc dưới sau khi đổi số tài khoản ngân hàng.
                    </small>
                  </div>
                </div>
              )}

              <SepaySettings />
            </div>
          )}

          {cardId === 'invoice_tax' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Thuế suất VAT (%)</label>
                <input
                  type="number"
                  step="1"
                  value={formTax.vat}
                  onChange={(e) => setFormTax({ ...formTax, vat: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field">
                <label>Phí dịch vụ ({formTax.feeMode === 'percent' ? '%' : 'VNĐ'})</label>
                <input
                  type="number"
                  step="1"
                  value={formTax.fee}
                  onChange={(e) => setFormTax({ ...formTax, fee: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field ar-form-grid-full">
                <label>Tên đơn vị xuất hóa đơn</label>
                <input
                  value={formTax.invoiceHeader}
                  onChange={(e) => setFormTax({ ...formTax, invoiceHeader: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Mã số thuế doanh nghiệp</label>
                <input
                  value={formTax.taxCode}
                  onChange={(e) => setFormTax({ ...formTax, taxCode: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Lời chúc chân trang in nhiệt</label>
                <input
                  value={formTax.invoiceFooterNote}
                  onChange={(e) => setFormTax({ ...formTax, invoiceFooterNote: e.target.value })}
                />
              </div>
            </div>
          )}

          {cardId === 'system_integrations' && (
            <EditableCrudList
              storageKey="system_integrations"
              savedRows={config.customTables?.system_integrations}
              onSyncTable={onSyncTable}
              description="Thêm, sửa, xóa các thiết bị phần cứng (Máy in, POS, Sensor 3D) và dịch vụ kết nối."
              onNotify={onShowToast}
              columns={[
                { key: 'device', label: 'Thiết bị / Tích hợp', placeholder: 'VD: Máy in nhiệt 80mm' },
                { key: 'endpoint', label: 'Địa chỉ IP / Cổng kết nối', placeholder: 'VD: 192.168.1.200:9100' },
                { key: 'status', label: 'Trạng thái', placeholder: 'Đã kết nối', badge: 'success' },
              ]}
              initialRows={[
                { device: 'Máy in nhiệt hóa đơn khổ 80mm', endpoint: 'LAN 192.168.1.200:9100', status: 'Đã kết nối' },
                { device: 'Cảm biến Foresight GC3 / Golfzon Vision', endpoint: 'Local Sync Bridge v2.4', status: 'Đang hoạt động' },
                { device: 'Zalo Cloud ZNS Brandname', endpoint: 'OA ID: 198273645019', status: 'Đã xác thực' },
                { device: 'Cổng gạch nợ tự động VietQR SePay', endpoint: 'Webhook /api/webhooks/sepay', status: 'Đang hoạt động' },
              ]}
            />
          )}

          {cardId === 'marketing_tools' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Facebook Pixel ID</label>
                <input
                  value={formMarketing.fbPixel}
                  onChange={(e) => setFormMarketing({ ...formMarketing, fbPixel: e.target.value })}
                  placeholder="889218291028"
                />
              </div>
              <div className="ar-field">
                <label>Google Analytics 4 Measurement ID</label>
                <input
                  value={formMarketing.ga4Id}
                  onChange={(e) => setFormMarketing({ ...formMarketing, ga4Id: e.target.value })}
                  placeholder="G-SIGOLF2026"
                />
              </div>
              <div className="ar-field">
                <label>Zalo Official Account ID</label>
                <input
                  value={formMarketing.zaloOaId}
                  onChange={(e) => setFormMarketing({ ...formMarketing, zaloOaId: e.target.value })}
                />
              </div>
              <div className="ar-field">
                <label>Google Maps Place ID</label>
                <input
                  value={formMarketing.mapsPlaceId}
                  onChange={(e) =>
                    setFormMarketing({ ...formMarketing, mapsPlaceId: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {cardId === 'staff_roles' && (
            <div>
              <StaffPanel actorRole="owner" />
            </div>
          )}

          {cardId === 'general_config' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Ngôn ngữ hiển thị</label>
                <select
                  value={formGeneral.language}
                  onChange={(e) => setFormGeneral({ ...formGeneral, language: e.target.value })}
                >
                  <option value="vi">Tiếng Việt (Mặc định)</option>
                  <option value="en">English</option>
                  <option value="ko">한국어 (Korean)</option>
                </select>
              </div>
              <div className="ar-field">
                <label>Đơn vị tiền tệ</label>
                <select
                  value={formGeneral.currency}
                  onChange={(e) => setFormGeneral({ ...formGeneral, currency: e.target.value })}
                >
                  <option value="VND">VNĐ (₫)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="ar-field">
                <label>Định dạng ngày tháng</label>
                <select
                  value={formGeneral.dateFormat}
                  onChange={(e) => setFormGeneral({ ...formGeneral, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (Ngày/Tháng/Năm)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (Chuẩn quốc tế)</option>
                </select>
              </div>
              <div className="ar-field">
                <label>Thời gian tự động làm mới dữ liệu POS</label>
                <select
                  value={formGeneral.autoRefreshSec}
                  onChange={(e) =>
                    setFormGeneral({ ...formGeneral, autoRefreshSec: Number(e.target.value) })
                  }
                >
                  <option value={15}>15 giây</option>
                  <option value={30}>30 giây (Khuyên dùng)</option>
                  <option value={60}>60 giây</option>
                </select>
              </div>
            </div>
          )}

          {cardId === 'security_backup' && (
            <div>
              <div className="ar-form-grid">
                <div className="ar-field ar-form-grid-full">
                  <label>Mật khẩu quản trị hiện tại</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formSecurity.oldPassword}
                    onChange={(e) => setFormSecurity({ ...formSecurity, oldPassword: e.target.value })}
                  />
                </div>
                <div className="ar-field">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formSecurity.newPassword}
                    onChange={(e) => setFormSecurity({ ...formSecurity, newPassword: e.target.value })}
                  />
                </div>
                <div className="ar-field">
                  <label>Nhập lại mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formSecurity.confirmPassword}
                    onChange={(e) =>
                      setFormSecurity({ ...formSecurity, confirmPassword: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#f8fafc',
                }}
              >
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  Sao lưu dữ liệu hệ thống (Backup)
                </strong>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 12px' }}>
                  Tải về bản sao lưu cơ sở dữ liệu SQLite của toàn bộ thông tin đặt sân, khách hàng và
                  giao dịch.
                </p>
                <button
                  type="button"
                  className="ar-btn-secondary"
                  onClick={() => {
                    onShowToast('Đang tạo và tải bản sao lưu SQLite...');
                    window.open('/api/export', '_blank');
                  }}
                >
                  <Download size={16} /> Tải dữ liệu sao lưu
                </button>
              </div>
            </div>
          )}

          {cardId === 'audit_logs' && (
            <div>
              {data?.audit && data.audit.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 8 }}>
                    ✓ Nhật ký thao tác thời gian thực từ cơ sở dữ liệu hệ thống ({data.audit.length} bản ghi mới nhất):
                  </p>
                  <table className="ar-modal-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Hành động</th>
                        <th>Chi tiết thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audit.slice(0, 15).map((a) => (
                        <tr key={a.id}>
                          <td>{new Date(a.created).toLocaleString('vi-VN')}</td>
                          <td><span className="ar-status-badge ar-badge-info">{a.action}</span></td>
                          <td>{a.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <EditableCrudList
                storageKey="audit_logs"
                savedRows={config.customTables?.audit_logs}
                onSyncTable={onSyncTable}
                description="Ghi chú kiểm toán bổ sung của Quản trị viên (đồng bộ cơ sở dữ liệu)."
                onNotify={onShowToast}
                columns={[
                  { key: 'time', label: 'Thời gian', placeholder: 'VD: 14:20 Hôm nay' },
                  { key: 'user', label: 'Tài khoản', placeholder: 'VD: Admin' },
                  { key: 'act', label: 'Hành động', placeholder: 'VD: Lưu cấu hình', badge: 'info' },
                  { key: 'det', label: 'Chi tiết thao tác', placeholder: 'Mô tả chi tiết' },
                ]}
                initialRows={[
                  { time: '10:45:12 Hôm nay', user: 'Admin', act: 'Lưu cấu hình', det: 'Cập nhật giờ hoạt động 06:00 - 23:00' },
                  { time: '09:30:00 Hôm nay', user: 'manager', act: 'Check-in Line', det: 'Bắt đầu line VIP 01 cho khách VIP' },
                ]}
              />
            </div>
          )}

          {/* Custom Admin-Created Function Card -> Full CRUD Parameter Table */}
          {String(cardId).startsWith('custom_') && (
            <EditableCrudList
              storageKey={cardId}
              savedRows={config.customTables?.[cardId]}
              onSyncTable={onSyncTable}
              description={`Danh sách thông số và quy tắc cấu hình cho chức năng "${card.title}".`}
              onNotify={onShowToast}
              columns={[
                { key: 'param', label: 'Tên thông số / Mục cấu hình', placeholder: 'VD: Phí thuê tủ tháng' },
                { key: 'value', label: 'Giá trị áp dụng', placeholder: 'VD: 500.000₫ / tháng' },
                { key: 'note', label: 'Ghi chú vận hành', placeholder: 'VD: Miễn phí cho hạng Diamond' },
                { key: 'status', label: 'Trạng thái', placeholder: 'Đang áp dụng', badge: 'success' },
              ]}
              initialRows={[
                { param: 'Trạng thái kích hoạt', value: 'Đang bật', note: 'Áp dụng trên toàn bộ cơ sở', status: 'Đang áp dụng' },
              ]}
            />
          )}
        </div>

        {/* Footer */}
        <div className="ar-modal-footer">
          <button type="button" className="ar-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="ar-btn-primary"
            disabled={busy}
            onClick={handleSave}
          >
            {busy ? <RefreshCw size={16} className="ar-spin" /> : <Save size={16} />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers for modal titles and subtitles
function getCardTitle(id: SettingsCardId, fallback?: string): string {
  const map: Record<string, string> = {
    facility_info: 'Cài đặt Thông tin cơ sở',
    rooms_lines: 'Quản lý Khu vực & Line / Phòng',
    operating_hours: 'Cài đặt Giờ hoạt động & Ngày lễ',
    facility_layout: 'Cài đặt Sơ đồ cơ sở trên POS',
    pricing_rates: 'Cấu hình Bảng giá giờ chơi',
    hour_packages: 'Quản lý Gói giờ & Thẻ',
    membership_tiers: 'Cài đặt Hạng hội viên & Quyền lợi',
    promotions_vouchers: 'Quản lý Ưu đãi & Mã giảm giá',
    fnb_menu: 'Quản lý Thực đơn F&B',
    extra_services: 'Cài đặt Dịch vụ bổ sung',
    inventory_stock: 'Quản lý Kho hàng & Tồn kho',
    suppliers_vendor: 'Danh sách Nhà cung cấp & Công nợ',
    crm_lead_sources: 'Cài đặt Nguồn thu hút Lead',
    crm_pipeline: 'Cấu hình Pipeline Bán hàng CRM',
    crm_automation: 'Kịch bản Chăm sóc Tự động',
    crm_tags: 'Phân nhóm & Thẻ tag Khách hàng',
    booking_rules: 'Quy tắc Đặt sân & Hủy lịch',
    tournament_settings: 'Cài đặt Giải đấu (Tournament)',
    academy_coaching: 'Quản lý Huấn luyện & Học viện Golf',
    matchmaking: 'Cài đặt tính năng Tìm bạn chơi',
    payment_methods: 'Phương thức Thanh toán & VietQR',
    invoice_tax: 'Cấu hình Hóa đơn & Thuế VAT',
    system_integrations: 'Tích hợp Thiết bị & Hệ thống ngoài',
    marketing_tools: 'Công cụ Tiếp thị & Theo dõi (Tracking)',
    staff_roles: 'Tài khoản Nhân viên & Phân quyền',
    general_config: 'Cấu hình Hệ thống Chung',
    security_backup: 'Bảo mật & Sao lưu Dữ liệu',
    audit_logs: 'Nhật ký Hoạt động Hệ thống',
  };
  return map[id] || fallback || 'Cài đặt chức năng';
}

function getCardSubtitle(id: SettingsCardId, fallback?: string): string {
  const map: Record<string, string> = {
    facility_info: 'Cập nhật tên thương hiệu, địa chỉ, số hotline và logo câu lạc bộ',
    rooms_lines: 'Thiết lập danh sách line tập GDR, phòng VIP và line tay trái',
    operating_hours: 'Quy định giờ mở cửa, đóng cửa, thời gian dọn line và ngày nghỉ lễ',
    facility_layout: 'Sắp xếp thứ tự các line và vị trí trực quan trên màn hình POS',
    pricing_rates: 'Điều chỉnh đơn giá line thường, phòng VIP và khung giờ vàng',
    hour_packages: 'Thiết lập các gói giờ ưu đãi nạp trước cho hội viên',
    membership_tiers: 'Quy định mốc tích lũy lên hạng và chính sách giảm giá riêng',
    promotions_vouchers: 'Tạo mã voucher giảm giá, ưu đãi khai trương và combo',
    fnb_menu: 'Cập nhật danh mục đồ ăn, nước uống và combo phục vụ khách',
    extra_services: 'Bảng giá thuê gậy, thuê giày tập, caddie và phòng học',
    inventory_stock: 'Theo dõi tồn kho, cảnh báo hết hàng và phiếu nhập/xuất',
    suppliers_vendor: 'Quản lý thông tin nhà cung cấp đồ uống và dụng cụ golf',
    crm_lead_sources: 'Khai báo các kênh tiếp cận khách hàng tiềm năng',
    crm_pipeline: 'Quy trình các giai đoạn chăm sóc khách từ lead đến chốt gói',
    crm_automation: 'Thiết lập tự động gửi tin Zalo/SMS xác nhận và nhắc lịch',
    crm_tags: 'Gắn thẻ phân loại golfer phục vụ cá nhân hóa trải nghiệm',
    booking_rules: 'Quy định số ngày đặt trước, thời gian hủy và tỷ lệ đặt cọc',
    tournament_settings: 'Thể thức thi đấu gậy, đối kháng, scrambles và tính điểm',
    academy_coaching: 'Chính sách HLV, khóa học golf căn bản và nâng cao',
    matchmaking: 'Cho phép người chơi đăng bài tìm bạn ghép cùng line',
    payment_methods: 'Cấu hình mã QR VietQR SePay, tiền mặt và quẹt thẻ',
    invoice_tax: 'Thuế suất VAT, phí dịch vụ và ghi chú in chân hóa đơn',
    system_integrations: 'Kết nối máy in nhiệt 80mm, SMS Brandname và Zalo OA',
    marketing_tools: 'Cài mã Facebook Pixel, Google Analytics và thẻ meta',
    staff_roles: 'Phân quyền tài khoản quản trị, quản lý ca và thu ngân',
    general_config: 'Tùy chỉnh ngôn ngữ, định dạng tiền tệ và âm thanh báo',
    security_backup: 'Đổi mật khẩu, bảo mật 2 lớp và tải file sao lưu cơ sở dữ liệu',
    audit_logs: 'Theo dõi chi tiết lịch sử thao tác của các tài khoản nhân viên',
  };
  return map[id] || fallback || 'Tùy chỉnh các thông số trong hệ thống';
}
