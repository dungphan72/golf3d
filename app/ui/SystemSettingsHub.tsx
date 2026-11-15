'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useMemo } from 'react';
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
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { Config } from '../../lib/club';
import type { Data } from './shared';
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
  | 'audit_logs';

type FilterTab = 'all' | 'operation' | 'business' | 'crm' | 'system';

interface CardDef {
  id: SettingsCardId;
  title: string;
  subtitle: string;
  icon: typeof Store;
  iconBg: string; // CSS class
  categoryGroup: string;
  tab: 'operation' | 'business' | 'crm' | 'system';
}

interface GroupDef {
  id: string;
  title: string;
  icon: typeof Building2;
  tab: 'operation' | 'business' | 'crm' | 'system';
  cards: CardDef[];
}

export function SystemSettingsHub({
  config,
  busy,
  data,
  activeSub,
  onSelectSub,
  onSave,
  onGo,
  onChanged,
}: {
  config: Config;
  busy?: boolean;
  data: Data | null;
  activeSub?: string;
  onSelectSub?: (sub: string) => void;
  onSave: (val: Partial<Config>) => Promise<boolean> | void;
  onGo?: (v: string) => void;
  onChanged?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCard, setOpenCard] = useState<SettingsCardId | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local draft states for modals
  const [draftConfig, setDraftConfig] = useState<Config>(config);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 7 Groups with 28 Cards exactly matching the 1:1 image
  const GROUPS: GroupDef[] = useMemo(
    () => [
      {
        id: 'facility',
        title: 'Thông tin cơ sở & vận hành',
        icon: Building2,
        tab: 'operation',
        cards: [
          {
            id: 'facility_info',
            title: 'Thông tin cơ sở',
            subtitle: 'Tên, địa chỉ, liên hệ, logo',
            icon: Store,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Thông tin cơ sở & vận hành',
            tab: 'operation',
          },
          {
            id: 'rooms_lines',
            title: 'Khu vực & Line/Phòng',
            subtitle: 'Quản lý line, phòng VIP, line tay trái',
            icon: Flag,
            iconBg: 'ar-icon-blue',
            categoryGroup: 'Thông tin cơ sở & vận hành',
            tab: 'operation',
          },
          {
            id: 'operating_hours',
            title: 'Giờ hoạt động',
            subtitle: 'Giờ mở cửa, khung giờ, ngày lễ',
            icon: Clock,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Thông tin cơ sở & vận hành',
            tab: 'operation',
          },
          {
            id: 'facility_layout',
            title: 'Sơ đồ cơ sở',
            subtitle: 'Cài đặt sơ đồ, vị trí line trên POS',
            icon: LayoutGrid,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Thông tin cơ sở & vận hành',
            tab: 'operation',
          },
        ],
      },
      {
        id: 'pricing',
        title: 'Giá, gói & hội viên',
        icon: Tag,
        tab: 'business',
        cards: [
          {
            id: 'pricing_rates',
            title: 'Bảng giá',
            subtitle: 'Giá theo giờ, ngày, khung giờ',
            icon: Coins,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Giá, gói & hội viên',
            tab: 'business',
          },
          {
            id: 'hour_packages',
            title: 'Gói giờ',
            subtitle: 'Tạo và quản lý gói giờ (nạp, tặng, thời hạn)',
            icon: Layers,
            iconBg: 'ar-icon-blue',
            categoryGroup: 'Giá, gói & hội viên',
            tab: 'business',
          },
          {
            id: 'membership_tiers',
            title: 'Hội viên',
            subtitle: 'Hạng hội viên, quyền lợi, điều kiện nâng hạng',
            icon: Crown,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Giá, gói & hội viên',
            tab: 'business',
          },
          {
            id: 'promotions_vouchers',
            title: 'Ưu đãi & Mã giảm giá',
            subtitle: 'Promotion, voucher, combo',
            icon: Percent,
            iconBg: 'ar-icon-pink',
            categoryGroup: 'Giá, gói & hội viên',
            tab: 'business',
          },
        ],
      },
      {
        id: 'products',
        title: 'Sản phẩm, dịch vụ & kho',
        icon: Package,
        tab: 'business',
        cards: [
          {
            id: 'fnb_menu',
            title: 'Sản phẩm F&B',
            subtitle: 'Đồ ăn, thức uống, combo',
            icon: Coffee,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Sản phẩm, dịch vụ & kho',
            tab: 'business',
          },
          {
            id: 'extra_services',
            title: 'Dịch vụ bổ sung',
            subtitle: 'Thuê gậy, caddie, phòng học, khác',
            icon: CheckCircle2,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Sản phẩm, dịch vụ & kho',
            tab: 'business',
          },
          {
            id: 'inventory_stock',
            title: 'Quản lý kho',
            subtitle: 'Nhập, xuất, tồn kho',
            icon: Box,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Sản phẩm, dịch vụ & kho',
            tab: 'business',
          },
          {
            id: 'suppliers_vendor',
            title: 'Nhà cung cấp',
            subtitle: 'Danh sách và công nợ NCC',
            icon: Truck,
            iconBg: 'ar-icon-purple',
            categoryGroup: 'Sản phẩm, dịch vụ & kho',
            tab: 'business',
          },
        ],
      },
      {
        id: 'crm',
        title: 'Khách hàng & CRM',
        icon: Users,
        tab: 'crm',
        cards: [
          {
            id: 'crm_lead_sources',
            title: 'Nguồn lead',
            subtitle: 'Kênh thu lead (Web, FB, Zalo, Form...)',
            icon: Target,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Khách hàng & CRM',
            tab: 'crm',
          },
          {
            id: 'crm_pipeline',
            title: 'Pipeline bán hàng',
            subtitle: 'Giai đoạn, quy trình xử lý',
            icon: Filter,
            iconBg: 'ar-icon-blue',
            categoryGroup: 'Khách hàng & CRM',
            tab: 'crm',
          },
          {
            id: 'crm_automation',
            title: 'Kịch bản chăm sóc',
            subtitle: 'Tự động hóa SMS/Zalo/Email',
            icon: Mail,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Khách hàng & CRM',
            tab: 'crm',
          },
          {
            id: 'crm_tags',
            title: 'Phân nhóm khách hàng',
            subtitle: 'Nhóm, thẻ tag, phân loại',
            icon: Users2,
            iconBg: 'ar-icon-purple',
            categoryGroup: 'Khách hàng & CRM',
            tab: 'crm',
          },
        ],
      },
      {
        id: 'booking_activity',
        title: 'Đặt sân, giải đấu & huấn luyện',
        icon: Calendar,
        tab: 'operation',
        cards: [
          {
            id: 'booking_rules',
            title: 'Cài đặt đặt sân',
            subtitle: 'Quy tắc đặt, cọc, hủy, thay đổi',
            icon: CalendarCheck,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
            tab: 'operation',
          },
          {
            id: 'tournament_settings',
            title: 'Giải đấu (Tournament)',
            subtitle: 'Thể thức, bảng điểm, xếp hạng',
            icon: Trophy,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
            tab: 'operation',
          },
          {
            id: 'academy_coaching',
            title: 'Huấn luyện (Academy)',
            subtitle: 'HLV, khóa học, lịch học, học viên',
            icon: GraduationCap,
            iconBg: 'ar-icon-purple',
            categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
            tab: 'operation',
          },
          {
            id: 'matchmaking',
            title: 'Tìm bạn chơi',
            subtitle: 'Bật/tắt và cài đặt tính năng',
            icon: UserPlus,
            iconBg: 'ar-icon-sky',
            categoryGroup: 'Đặt sân, giải đấu & huấn luyện',
            tab: 'operation',
          },
        ],
      },
      {
        id: 'payment_integration',
        title: 'Thanh toán & tích hợp',
        icon: CreditCard,
        tab: 'system',
        cards: [
          {
            id: 'payment_methods',
            title: 'Phương thức thanh toán',
            subtitle: 'Tiền mặt, chuyển khoản, ví điện tử, QR',
            icon: CreditCard,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Thanh toán & tích hợp',
            tab: 'system',
          },
          {
            id: 'invoice_tax',
            title: 'Hóa đơn & Thuế',
            subtitle: 'Mẫu hóa đơn, thuế VAT, phí dịch vụ',
            icon: FileText,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Thanh toán & tích hợp',
            tab: 'system',
          },
          {
            id: 'system_integrations',
            title: 'Tích hợp hệ thống',
            subtitle: 'Máy POS, máy in, SMS, Zalo, Email, Google Maps, Cloud',
            icon: Link2,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Thanh toán & tích hợp',
            tab: 'system',
          },
          {
            id: 'marketing_tools',
            title: 'Công cụ marketing',
            subtitle: 'Zalo OA, Facebook, Google, UTM tracking',
            icon: Megaphone,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Thanh toán & tích hợp',
            tab: 'system',
          },
        ],
      },
      {
        id: 'system_users',
        title: 'Người dùng, phân quyền & hệ thống',
        icon: ShieldCheck,
        tab: 'system',
        cards: [
          {
            id: 'staff_roles',
            title: 'Tài khoản & Phân quyền',
            subtitle: 'Nhân viên, vai trò, quyền truy cập',
            icon: UserCheck,
            iconBg: 'ar-icon-emerald',
            categoryGroup: 'Người dùng, phân quyền & hệ thống',
            tab: 'system',
          },
          {
            id: 'general_config',
            title: 'Cấu hình chung',
            subtitle: 'Ngôn ngữ, tiền tệ, định dạng, thông báo',
            icon: Settings2,
            iconBg: 'ar-icon-amber',
            categoryGroup: 'Người dùng, phân quyền & hệ thống',
            tab: 'system',
          },
          {
            id: 'security_backup',
            title: 'Bảo mật & Sao lưu',
            subtitle: 'Mật khẩu, 2FA, sao lưu dữ liệu',
            icon: Database,
            iconBg: 'ar-icon-blue',
            categoryGroup: 'Người dùng, phân quyền & hệ thống',
            tab: 'system',
          },
          {
            id: 'audit_logs',
            title: 'Nhật ký hoạt động',
            subtitle: 'Lịch sử thao tác, truy cập',
            icon: FileSpreadsheet,
            iconBg: 'ar-icon-purple',
            categoryGroup: 'Người dùng, phân quyền & hệ thống',
            tab: 'system',
          },
        ],
      },
    ],
    [],
  );

  // Sync with sidebar active sub
  const effectiveTab = useMemo(() => {
    if (activeSub === 'facility') return 'operation';
    if (activeSub === 'hours') return 'operation';
    if (activeSub === 'pricing') return 'business';
    if (activeSub === 'payment') return 'system';
    if (activeSub === 'staff') return 'system';
    if (activeSub === 'integration') return 'system';
    if (activeSub === 'security') return 'system';
    return activeTab;
  }, [activeSub, activeTab]);

  // Filter groups according to activeTab & searchQuery
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GROUPS.map((group) => {
      // Check if group matches tab
      const tabMatch = effectiveTab === 'all' || group.tab === effectiveTab;
      if (!tabMatch && !q) return null;

      // Filter cards by search
      const cards = group.cards.filter((card) => {
        if (!q) return true;
        return (
          card.title.toLowerCase().includes(q) ||
          card.subtitle.toLowerCase().includes(q) ||
          card.categoryGroup.toLowerCase().includes(q)
        );
      });

      if (cards.length === 0) return null;
      return { ...group, cards };
    }).filter(Boolean) as GroupDef[];
  }, [GROUPS, effectiveTab, searchQuery]);

  // Save handler for Config
  const handleSaveConfig = async (patch: Partial<Config>) => {
    const next = { ...draftConfig, ...patch };
    setDraftConfig(next);
    await onSave(patch);
    showToast('Đã lưu cấu hình thành công!');
    setOpenCard(null);
    onChanged?.();
  };

  return (
    <div className="ar-settings-hub">
      {/* Page Header */}
      <div className="ar-settings-header">
        <div className="ar-settings-header-icon">
          <Settings2 />
        </div>
        <div className="ar-settings-header-text">
          <h1>Cài đặt hệ thống</h1>
          <p>Quản trị và cấu hình toàn bộ chức năng của ứng dụng</p>
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

      {/* 7 Category Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
          Không tìm thấy chức năng hoặc cài đặt phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        filteredGroups.map((group) => {
          const GIcon = group.icon;
          return (
            <section key={group.id} className="ar-settings-group" id={`group-${group.id}`}>
              <div className="ar-group-title">
                <GIcon />
                <span>{group.title}</span>
              </div>
              <div className="ar-cards-grid">
                {group.cards.map((card) => {
                  const CIcon = card.icon;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className="ar-card-item"
                      onClick={() => setOpenCard(card.id)}
                    >
                      <div className={`ar-card-icon ${card.iconBg}`}>
                        <CIcon />
                      </div>
                      <div className="ar-card-content">
                        <h3 className="ar-card-title">{card.title}</h3>
                        <p className="ar-card-subtitle">{card.subtitle}</p>
                      </div>
                      <ChevronRight className="ar-card-arrow" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="ar-settings-toast">
          <Check />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Interactive Modals for all 28 Cards */}
      {openCard && (
        <SettingsCardModal
          cardId={openCard}
          config={draftConfig}
          data={data}
          busy={busy}
          onClose={() => setOpenCard(null)}
          onSave={handleSaveConfig}
          onShowToast={showToast}
          onGo={onGo}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Interactive Modal Engine covering all 28 settings cards
// -----------------------------------------------------------------------------
function SettingsCardModal({
  cardId,
  config,
  data,
  busy,
  onClose,
  onSave,
  onShowToast,
  onGo,
}: {
  cardId: SettingsCardId;
  config: Config;
  data: Data | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Config>) => Promise<void> | void;
  onShowToast: (msg: string) => void;
  onGo?: (v: string) => void;
}) {
  // Local states per modal type
  const [formFacility, setFormFacility] = useState({
    name: config.name || '',
    address: config.address || '',
    hotline: '0877834888',
    email: 'contact@sigolf.vn',
    website: 'https://sigolf.vn',
    logo: '/logo.webp',
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
    depositPercent: 30,
    autoCancelGrace: 15,
    onlineEnabled: !!config.onlineEnabled,
    onlineSlug: config.onlineSlug || 'sigolf-club',
  });

  const [formPrices, setFormPrices] = useState({
    rate: config.rate || 350000,
    happy: config.happy || 250000,
    vipRate: config.vipRate || 500000,
    vipHappy: config.vipHappy || 400000,
  });

  const [formPayment, setFormPayment] = useState({
    bankBin: config.bankBin || '970422',
    bankAccount: config.bankAccount || '0877834888',
    bankHolder: config.bankHolder || 'SAIGON INDOOR GOLF CLUB',
    cashEnabled: true,
    vietQrEnabled: true,
    momoEnabled: true,
    posCardEnabled: true,
  });

  const [formTax, setFormTax] = useState({
    vat: config.vat ?? 8,
    fee: config.fee ?? 5,
    feeMode: config.feeMode || 'percent',
    invoiceHeader: 'CÔNG TY TNHH SAIGON INDOOR GOLF',
    taxCode: '0318889999',
    invoiceFooterNote: 'Cảm ơn Quý khách & Hẹn gặp lại!',
  });

  const [formMembership, setFormMembership] = useState({
    gold: config.tierThresholds?.gold ?? 20000000,
    platinum: config.tierThresholds?.platinum ?? 50000000,
    diamond: config.tierThresholds?.diamond ?? 100000000,
    benefits: [...(config.memberBenefits ?? [
      'Ưu tiên đặt line giờ cao điểm',
      'Giảm 10% F&B và dịch vụ thuê gậy',
      'Miễn phí 1 giờ chơi vào ngày sinh nhật',
      'Tặng gói caddie 5 buổi/năm',
    ])],
  });

  const [newBenefit, setNewBenefit] = useState('');

  // General Config
  const [formGeneral, setFormGeneral] = useState({
    language: 'vi',
    currency: 'VND',
    dateFormat: 'DD/MM/YYYY',
    soundAlert: true,
    autoRefreshSec: 30,
  });

  // Security
  const [formSecurity, setFormSecurity] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactor: false,
    autoBackupTime: '02:00',
  });

  // Marketing tools
  const [formMarketing, setFormMarketing] = useState({
    fbPixel: '889218291028',
    ga4Id: 'G-SIGOLF2026',
    mapsPlaceId: 'ChIJ...SigolfClub',
    zaloOaId: '198273645019',
    utmDefault: 'utm_source=web&utm_medium=cpc',
  });

  // Matchmaking
  const [formMatchmaking, setFormMatchmaking] = useState({
    enabled: true,
    maxHdcDiff: 8,
    allowPublicFind: true,
    autoNotifyZalo: true,
  });

  // Tournament
  const [formTournament, setFormTournament] = useState({
    defaultFormat: 'Stroke Play',
    hdcSystem: 'System 36',
    liveLeaderboard: true,
    maxPlayers: 36,
  });

  // Academy
  const [formAcademy, setFormAcademy] = useState({
    commissionRate: 35,
    lessonMinutes: 60,
    cancelLessonHours: 4,
    freeTrialAvailable: true,
  });

  // Submitting logic
  const handleSave = async () => {
    if (cardId === 'facility_info') {
      await onSave({
        name: formFacility.name,
        address: formFacility.address,
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
        onlineEnabled: formBookingRules.onlineEnabled,
        onlineSlug: formBookingRules.onlineSlug,
      });
      return;
    }
    if (cardId === 'pricing_rates') {
      await onSave({
        rate: Number(formPrices.rate),
        happy: Number(formPrices.happy),
        vipRate: Number(formPrices.vipRate),
        vipHappy: Number(formPrices.vipHappy),
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

    // Generic save for other domains
    onShowToast('Đã lưu thiết lập thành công!');
    onClose();
  };

  // Render modal content per cardId
  return (
    <div className="ar-settings-modal-backdrop" onClick={onClose}>
      <div
        className="ar-settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="ar-modal-header">
          <div className="ar-modal-header-left">
            <div className="ar-modal-header-icon ar-icon-emerald">
              <Settings2 />
            </div>
            <div>
              <h2 className="ar-modal-header-title">{getCardTitle(cardId)}</h2>
              <p className="ar-modal-header-subtitle">{getCardSubtitle(cardId)}</p>
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
                  placeholder="250 Lương Định Của, Phường An Phú, TP. Thủ Đức"
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
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Quản lý trạng thái, chủng loại và sức chứa của các Line và phòng VIP trong cơ sở.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Mã Line</th>
                    <th>Tên hiển thị</th>
                    <th>Loại</th>
                    <th>Tay thuận</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'line-1', name: 'Line 01', type: 'Standard', hand: 'Phải', status: 'Hoạt động' },
                    { id: 'line-2', name: 'Line 02', type: 'Standard', hand: 'Phải', status: 'Hoạt động' },
                    { id: 'line-3', name: 'Line 03', type: 'Standard', hand: 'Phải', status: 'Hoạt động' },
                    { id: 'line-4', name: 'Line 04', type: 'Standard', hand: 'Phải', status: 'Hoạt động' },
                    { id: 'line-5', name: 'Line 05', type: 'Standard', hand: 'Phải', status: 'Hoạt động' },
                    { id: 'line-10', name: 'Line 10 (Tay trái)', type: 'Standard', hand: 'Cả hai', status: 'Hoạt động' },
                    { id: 'vip-1', name: 'VIP 01 (Suite)', type: 'VIP', hand: 'Cả hai', status: 'Hoạt động' },
                    { id: 'vip-2', name: 'VIP 02 (President)', type: 'VIP', hand: 'Cả hai', status: 'Hoạt động' },
                  ].map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.id}</strong></td>
                      <td>{r.name}</td>
                      <td>
                        <span className={`ar-status-badge ${r.type === 'VIP' ? 'ar-badge-warning' : 'ar-badge-info'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td>{r.hand}</td>
                      <td>
                        <span className="ar-status-badge ar-badge-success">{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  Danh sách ngày lễ (áp dụng giá ngày lễ)
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
                        setFormHours({ ...formHours, holidays: [...formHours.holidays, newHoliday].sort() });
                        setNewHoliday('');
                      }
                    }}
                  >
                    <Plus size={16} /> Thêm ngày
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
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Cấu hình cách sắp xếp khu vực và vị trí các line trên giao diện POS Bán hàng.
              </p>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Chia theo khu vực (Tầng 1 - Khu tập & Tầng 2 - Phòng VIP)</strong>
                  <small>Gom nhóm các line theo tầng và phòng VIP riêng biệt</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Hiển thị số line theo định dạng lưới 4 cột</strong>
                  <small>Tối ưu không gian hiển thị cho màn hình POS cảm ứng</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
            </div>
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
              <small style={{ color: '#64748b' }}>
                Hệ thống hỗ trợ cấu hình phụ thu cuối tuần, bảng giá 9 hố và 18 hố chi tiết trong mục Bảng giá mở rộng.
              </small>
            </div>
          )}

          {cardId === 'hour_packages' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Danh sách các gói giờ hội viên nạp trước với ưu đãi tặng thêm giờ chơi và thời hạn sử dụng.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Tên gói</th>
                    <th>Giờ chính</th>
                    <th>Tặng kèm</th>
                    <th>Đơn giá (VNĐ)</th>
                    <th>Hạn dùng</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Gói Trải Nghiệm 10h', h: '10h', bonus: '+1h', price: '3.200.000', days: '60 ngày' },
                    { name: 'Gói Tiêu Chuẩn 25h', h: '25h', bonus: '+3h', price: '7.500.000', days: '90 ngày' },
                    { name: 'Gói Golfer Thân Thiết 50h', h: '50h', bonus: '+8h', price: '14.000.000', days: '180 ngày' },
                    { name: 'Gói VIP Không Giới Hạn', h: '100h', bonus: '+20h', price: '26.000.000', days: '365 ngày' },
                  ].map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.h}</td>
                      <td><span className="ar-status-badge ar-badge-success">{p.bonus}</span></td>
                      <td>{p.price}</td>
                      <td>{p.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="ar-btn-secondary"
                  onClick={() => {
                    onClose();
                    onGo?.('members');
                  }}
                >
                  Mở trang Quản lý Hội viên & Thẻ &rarr;
                </button>
              </div>
            </div>
          )}

          {cardId === 'membership_tiers' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Cấu hình mốc chi tiêu tích lũy và điều kiện nâng hạng hội viên (Gold, Platinum, Diamond).
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
                    onChange={(e) => setFormMembership({ ...formMembership, platinum: Number(e.target.value) })}
                  />
                </div>
                <div className="ar-field ar-form-grid-full">
                  <label>Mốc tích lũy hạng Diamond (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={formMembership.diamond}
                    onChange={(e) => setFormMembership({ ...formMembership, diamond: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Đặc quyền hội viên
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
                <ul style={{ paddingLeft: '18px', marginTop: '10px', fontSize: '13px', color: '#334155' }}>
                  {formMembership.benefits.map((b, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {b}{' '}
                      <button
                        type="button"
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                        onClick={() =>
                          setFormMembership({
                            ...formMembership,
                            benefits: formMembership.benefits.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {cardId === 'promotions_vouchers' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Chương trình khuyến mãi, voucher kích cầu và mã giảm giá cho khách hàng.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Mã Voucher</th>
                    <th>Chương trình</th>
                    <th>Mức giảm</th>
                    <th>Thời hạn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'GOLFNEW20', name: 'Khách hàng mới trải nghiệm', val: 'Giảm 20%', exp: '31/12/2026', st: 'Đang chạy' },
                    { code: 'HAPPYMORNING', name: 'Giờ vàng sáng 6h-11h', val: 'Đồng giá 250k', exp: 'Không giới hạn', st: 'Đang chạy' },
                    { code: 'VIPCOMBO', name: 'Combo VIP 2 người', val: 'Giảm 150.000₫', exp: '30/11/2026', st: 'Đang chạy' },
                  ].map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.code}</strong></td>
                      <td>{p.name}</td>
                      <td><span className="ar-status-badge ar-badge-success">{p.val}</span></td>
                      <td>{p.exp}</td>
                      <td><span className="ar-status-badge ar-badge-success">{p.st}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cardId === 'fnb_menu' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Thực đơn F&B phục vụ tại Line chơi và phòng chờ (Cà phê, Nước ngọt, Đồ ăn nhẹ).
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Tên món / đồ uống</th>
                    <th>Danh mục</th>
                    <th>Giá bán</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Cà phê Muối Signature', cat: 'Đồ uống', price: '45.000₫', st: 'Còn hàng' },
                    { name: 'Trà Đào Cam Sả', cat: 'Đồ uống', price: '49.000₫', st: 'Còn hàng' },
                    { name: 'Nước Ion Pocari Sweat', cat: 'Đồ uống', price: '30.000₫', st: 'Còn hàng' },
                    { name: 'Bánh Mì Thịt Nướng Bơ Tỏi', cat: 'Đồ ăn', price: '55.000₫', st: 'Còn hàng' },
                    { name: 'Combo Swing & Coffee', cat: 'Combo', price: '79.000₫', st: 'Còn hàng' },
                  ].map((m, i) => (
                    <tr key={i}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.cat}</td>
                      <td>{m.price}</td>
                      <td><span className="ar-status-badge ar-badge-success">{m.st}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Bảng giá dịch vụ bổ sung: Thuê gậy, Caddie hỗ trợ, Găng tay, Giày tập, Phòng Putting.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Tên dịch vụ</th>
                    <th>Đơn vị tính</th>
                    <th>Đơn giá</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Thuê bộ gậy TaylorMade Stealth', unit: 'Buổi chơi', price: '150.000₫', note: 'Nam / Cán R' },
                    { name: 'Thuê bộ gậy Nữ Callaway Reva', unit: 'Buổi chơi', price: '150.000₫', note: 'Nữ / Cán L' },
                    { name: 'Phí Caddie hỗ trợ Swing / Nhặt bóng', unit: 'Giờ', price: '100.000₫', note: 'Cần đặt trước' },
                    { name: 'Thuê giày golf FootJoy', unit: 'Buổi', price: '50.000₫', note: 'Size 38 - 43' },
                  ].map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.unit}</td>
                      <td>{s.price}</td>
                      <td>{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cardId === 'inventory_stock' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Quản lý số lượng tồn kho, cảnh báo hết hàng và phiếu nhập/xuất kho F&B, phụ kiện golf.
              </p>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Tự động trừ kho khi thanh toán hóa đơn POS</strong>
                  <small>Giảm tồn kho món ăn/nước uống ngay khi hoàn tất đơn</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Thông báo khi mặt hàng sắp hết (Dưới định mức tối thiểu)</strong>
                  <small>Cảnh báo thủ kho khi số lượng tồn dưới 10 đơn vị</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
            </div>
          )}

          {cardId === 'suppliers_vendor' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Danh sách nhà cung cấp đồ uống, thực phẩm và trang thiết bị sân tập 3D.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Nhà cung cấp</th>
                    <th>Mặt hàng</th>
                    <th>Hotline</th>
                    <th>Công nợ hiện tại</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Công ty Nước Giải Khát Tân Hiệp', item: 'Nước khoáng, Nước tăng lực', phone: '0903112233', debt: '2.500.000₫' },
                    { name: 'Foresight Golf Việt Nam', item: 'Sensor, Bóng golf chuyên dụng', phone: '0918776655', debt: '0₫' },
                    { name: 'Xưởng Cà Phê Cầu Đất', item: 'Hạt Arabica & Robusta rang mộc', phone: '0988445566', debt: '1.200.000₫' },
                  ].map((v, i) => (
                    <tr key={i}>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.item}</td>
                      <td>{v.phone}</td>
                      <td>{v.debt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cardId === 'crm_lead_sources' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Kênh thu hút khách hàng tiềm năng và phân bổ tỷ lệ chuyển đổi.
              </p>
              <div className="ar-form-grid">
                {[
                  'Website Đặt sân trực tuyến',
                  'Fanpage Facebook / Messenger',
                  'Zalo Official Account (OA)',
                  'Khách vãng lai đến trực tiếp (Walk-in)',
                  'Hội viên giới thiệu (Referral)',
                  'Sự kiện & Giải đấu Tournament',
                ].map((s, i) => (
                  <div key={i} className="ar-switch-row" style={{ gridColumn: 'span 2' }}>
                    <div className="ar-switch-label">
                      <strong>{s}</strong>
                      <small>Kênh thu thập lead đang hoạt động</small>
                    </div>
                    <label className="ar-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="ar-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cardId === 'crm_pipeline' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Quy trình các giai đoạn xử lý khách hàng tiềm năng từ Lead mới đến Chốt gói hội viên.
              </p>
              <ol style={{ paddingLeft: '20px', fontSize: '13.5px', color: '#334155', lineHeight: '2' }}>
                <li><strong>1. Lead Mới:</strong> Khách để lại thông tin hoặc đặt lịch trực tuyến</li>
                <li><strong>2. Đã Liên Hệ:</strong> Nhân viên CSKH gọi xác nhận và tư vấn</li>
                <li><strong>3. Trải Nghiệm Line:</strong> Khách đến chơi thử 1 buổi đầu tiên</li>
                <li><strong>4. Báo Giá Gói / Thẻ:</strong> Tư vấn gói giờ 25h/50h/100h hoặc khóa học</li>
                <li><strong>5. Chốt Thành Công (Won):</strong> Khách nạp gói hoặc đăng ký hội viên</li>
                <li><strong>6. Tạm Hoãn / Thất Bại (Lost):</strong> Lưu trữ và chăm sóc lại sau 30 ngày</li>
              </ol>
            </div>
          )}

          {cardId === 'crm_automation' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Cấu hình gửi tin nhắn tự động chăm sóc khách qua Zalo ZNS / SMS.
              </p>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Tin nhắn xác nhận đặt lịch ngay sau khi book</strong>
                  <small>Gửi thông tin giờ chơi, số line và mã đặt sân</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Tin nhắn nhắc lịch trước 2 giờ chơi</strong>
                  <small>Nhắc khách chuẩn bị đến sân đúng giờ</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Chúc mừng sinh nhật kèm Voucher tặng 1 giờ chơi</strong>
                  <small>Tự động gửi vào lúc 08:00 sáng ngày sinh nhật của hội viên</small>
                </div>
                <label className="ar-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="ar-slider" />
                </label>
              </div>
            </div>
          )}

          {cardId === 'crm_tags' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Quản lý các thẻ tag phân loại đặc điểm của golfer để phục vụ tốt nhất.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {[
                  { tag: 'Golfer Pro / Handicap thấp', color: '#dcfce7', text: '#15803d' },
                  { tag: 'Golfer Tay Trái', color: '#e0f2fe', text: '#0284c7' },
                  { tag: 'Doanh Nhân / VIP', color: '#fef3c7', text: '#b45309' },
                  { tag: 'Khách Chơi Thường Xuyên', color: '#f3e8ff', text: '#9333ea' },
                  { tag: 'Người Mới Bắt Đầu (Newbie)', color: '#fee2e2', text: '#b91c1c' },
                  { tag: 'Học Viên Đang Theo Học HLV', color: '#ffedd5', text: '#c2410c' },
                ].map((t, i) => (
                  <span
                    key={i}
                    style={{
                      background: t.color,
                      color: t.text,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    #{t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {cardId === 'booking_rules' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Cho phép đặt trước tối đa (ngày)</label>
                <input
                  type="number"
                  value={formBookingRules.days}
                  onChange={(e) => setFormBookingRules({ ...formBookingRules, days: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field">
                <label>Hạn hủy lịch trước (giờ)</label>
                <input
                  type="number"
                  value={formBookingRules.cancelHours}
                  onChange={(e) => setFormBookingRules({ ...formBookingRules, cancelHours: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field">
                <label>Tỷ lệ tiền cọc giữ sân (%)</label>
                <input
                  type="number"
                  value={formBookingRules.depositPercent}
                  onChange={(e) => setFormBookingRules({ ...formBookingRules, depositPercent: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field">
                <label>Thời gian giữ chỗ khi đến trễ (phút)</label>
                <input
                  type="number"
                  value={formBookingRules.autoCancelGrace}
                  onChange={(e) => setFormBookingRules({ ...formBookingRules, autoCancelGrace: Number(e.target.value) })}
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
                      onChange={(e) => setFormBookingRules({ ...formBookingRules, onlineEnabled: e.target.checked })}
                    />
                    <span className="ar-slider" />
                  </label>
                </div>
              </div>
              <div className="ar-field ar-form-grid-full">
                <label>Đường dẫn trang đặt lịch trực tuyến</label>
                <input
                  value={formBookingRules.onlineSlug}
                  onChange={(e) => setFormBookingRules({ ...formBookingRules, onlineSlug: e.target.value })}
                  placeholder="sigolf-club"
                />
                <small>Khách truy cập tại: https://sigolf.vn/dat-lich/{formBookingRules.onlineSlug}</small>
              </div>
            </div>
          )}

          {cardId === 'tournament_settings' && (
            <div className="ar-form-grid">
              <div className="ar-field">
                <label>Thể thức thi đấu mặc định</label>
                <select
                  value={formTournament.defaultFormat}
                  onChange={(e) => setFormTournament({ ...formTournament, defaultFormat: e.target.value })}
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
                  onChange={(e) => setFormTournament({ ...formTournament, hdcSystem: e.target.value })}
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
                      onChange={(e) => setFormTournament({ ...formTournament, liveLeaderboard: e.target.checked })}
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
                  onChange={(e) => setFormAcademy({ ...formAcademy, commissionRate: Number(e.target.value) })}
                />
              </div>
              <div className="ar-field">
                <label>Thời lượng 1 buổi học tiêu chuẩn (phút)</label>
                <input
                  type="number"
                  value={formAcademy.lessonMinutes}
                  onChange={(e) => setFormAcademy({ ...formAcademy, lessonMinutes: Number(e.target.value) })}
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
                      onChange={(e) => setFormAcademy({ ...formAcademy, freeTrialAvailable: e.target.checked })}
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
                    onChange={(e) => setFormMatchmaking({ ...formMatchmaking, enabled: e.target.checked })}
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
                    onChange={(e) => setFormMatchmaking({ ...formMatchmaking, maxHdcDiff: Number(e.target.value) })}
                  />
                  <small>Ví dụ: chênh lệch tối đa 8 gậy để trận đấu cân bằng</small>
                </div>
                <div className="ar-field">
                  <label>Tự động thông báo qua Zalo khi có người tìm ghép</label>
                  <select
                    value={formMatchmaking.autoNotifyZalo ? 'yes' : 'no'}
                    onChange={(e) => setFormMatchmaking({ ...formMatchmaking, autoNotifyZalo: e.target.value === 'yes' })}
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
                  <label>Mã ngân hàng (BIN VietQR)</label>
                  <input
                    value={formPayment.bankBin}
                    onChange={(e) => setFormPayment({ ...formPayment, bankBin: e.target.value })}
                    placeholder="970422 (MB Bank)"
                  />
                </div>
                <div className="ar-field">
                  <label>Số tài khoản thụ hưởng</label>
                  <input
                    value={formPayment.bankAccount}
                    onChange={(e) => setFormPayment({ ...formPayment, bankAccount: e.target.value })}
                    placeholder="0877834888"
                  />
                </div>
                <div className="ar-field ar-form-grid-full">
                  <label>Tên chủ tài khoản (In hoa không dấu)</label>
                  <input
                    value={formPayment.bankHolder}
                    onChange={(e) => setFormPayment({ ...formPayment, bankHolder: e.target.value })}
                    placeholder="SAIGON INDOOR GOLF CLUB"
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Các phương thức chấp nhận thanh toán
                </label>
                <div className="ar-switch-row" style={{ marginTop: '8px' }}>
                  <div className="ar-switch-label">
                    <strong>Chuyển khoản VietQR tự động qua SePay</strong>
                    <small>Tự động kiểm tra giao dịch và hoàn tất đơn trong 3 giây</small>
                  </div>
                  <label className="ar-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ar-slider" />
                  </label>
                </div>
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Thanh toán tiền mặt tại quầy (Cash)</strong>
                    <small>Thu ngân xác nhận tiền mặt</small>
                  </div>
                  <label className="ar-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ar-slider" />
                  </label>
                </div>
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Quẹt thẻ máy POS ngân hàng (Visa, Master, Napas)</strong>
                    <small>Kết nối thiết bị quẹt thẻ ngân hàng</small>
                  </div>
                  <label className="ar-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="ar-slider" />
                  </label>
                </div>
              </div>
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
            <div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Máy in nhiệt hóa đơn khổ 80mm / 58mm</strong>
                  <small>In hóa đơn tự động khi khách thanh toán thành công</small>
                </div>
                <span className="ar-status-badge ar-badge-success">Đã kết nối</span>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Tích hợp cảm biến Foresight GC3 / Golf Simulator</strong>
                  <small>Đồng bộ thời gian chơi và thông số cú đánh tự động</small>
                </div>
                <span className="ar-status-badge ar-badge-success">Đang hoạt động</span>
              </div>
              <div className="ar-switch-row">
                <div className="ar-switch-label">
                  <strong>Tích hợp Zalo Cloud / ZNS Brandname</strong>
                  <small>Gửi thông báo mã QR đặt sân và điểm tích lũy</small>
                </div>
                <span className="ar-status-badge ar-badge-success">Đã xác thực</span>
              </div>
            </div>
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
                  onChange={(e) => setFormMarketing({ ...formMarketing, mapsPlaceId: e.target.value })}
                />
              </div>
            </div>
          )}

          {cardId === 'staff_roles' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Danh sách tài khoản nhân viên, phân quyền truy cập chức năng và trạng thái kích hoạt.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Họ và tên</th>
                    <th>Vai trò</th>
                    <th>Quyền hạn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { u: 'admin', name: 'Quản trị viên', role: 'Chủ cơ sở', perm: 'Toàn quyền hệ thống', st: 'Hoạt động' },
                    { u: 'manager', name: 'Nguyễn Văn Quản Lý', role: 'Quản lý ca', perm: 'POS, Báo cáo, Đặt sân', st: 'Hoạt động' },
                    { u: 'cashier1', name: 'Trần Thị Thu Ngân', role: 'Thu ngân', perm: 'POS, Thanh toán, F&B', st: 'Hoạt động' },
                    { u: 'reception', name: 'Lê Hoàng Lễ Tân', role: 'Lễ tân', perm: 'Đặt sân, CRM Khách hàng', st: 'Hoạt động' },
                  ].map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.u}</strong></td>
                      <td>{s.name}</td>
                      <td><span className="ar-status-badge ar-badge-info">{s.role}</span></td>
                      <td>{s.perm}</td>
                      <td><span className="ar-status-badge ar-badge-success">{s.st}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  onChange={(e) => setFormGeneral({ ...formGeneral, autoRefreshSec: Number(e.target.value) })}
                >
                  <option value={15}>15 giây</option>
                  <option value={30}>30 giây (Khuyên dùng)</option>
                  <option value={60}>60 giây</option>
                </select>
              </div>
              <div className="ar-field ar-form-grid-full">
                <div className="ar-switch-row">
                  <div className="ar-switch-label">
                    <strong>Âm thanh chuông báo khi có khách gọi phục vụ hoặc booking mới</strong>
                    <small>Phát tiếng chuông ting-tong trên máy thu ngân</small>
                  </div>
                  <label className="ar-switch">
                    <input
                      type="checkbox"
                      checked={formGeneral.soundAlert}
                      onChange={(e) => setFormGeneral({ ...formGeneral, soundAlert: e.target.checked })}
                    />
                    <span className="ar-slider" />
                  </label>
                </div>
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
                    onChange={(e) => setFormSecurity({ ...formSecurity, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Sao lưu dữ liệu hệ thống (Backup)</strong>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 12px' }}>
                  Tải về bản sao lưu cơ sở dữ liệu SQLite của toàn bộ thông tin đặt sân, khách hàng và giao dịch.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="ar-btn-secondary"
                    onClick={() => {
                      onShowToast('Đang tạo và tải bản sao lưu SQLite...');
                      window.open('/api/admin/backup', '_blank');
                    }}
                  >
                    <Download size={16} /> Tải bản sao lưu (.sqlite)
                  </button>
                </div>
              </div>
            </div>
          )}

          {cardId === 'audit_logs' && (
            <div>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Nhật ký các thao tác quan trọng: Đăng nhập, thay đổi bảng giá, hủy hóa đơn, cấu hình phòng.
              </p>
              <table className="ar-modal-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: '10:45:12 Hôm nay', user: 'Admin', act: 'Lưu cấu hình', det: 'Cập nhật giờ hoạt động 06:00 - 23:00' },
                    { time: '09:30:00 Hôm nay', user: 'manager', act: 'Check-in Line', det: 'Bắt đầu line VIP 01 cho khách VIP' },
                    { time: '08:15:22 Hôm nay', user: 'cashier1', act: 'Thanh toán POS', det: 'Hoàn tất đơn #HD-9082 (750.000₫)' },
                    { time: '21:05:14 Hôm qua', user: 'Admin', act: 'Đăng nhập', det: 'Đăng nhập thành công từ IP 103.74.x.x' },
                  ].map((l, i) => (
                    <tr key={i}>
                      <td><small>{l.time}</small></td>
                      <td><strong>{l.user}</strong></td>
                      <td><span className="ar-status-badge ar-badge-info">{l.act}</span></td>
                      <td>{l.det}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
function getCardTitle(id: SettingsCardId): string {
  const map: Record<SettingsCardId, string> = {
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
  return map[id] || 'Cài đặt';
}

function getCardSubtitle(id: SettingsCardId): string {
  const map: Record<SettingsCardId, string> = {
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
  return map[id] || 'Tùy chỉnh các thông số trong hệ thống';
}
