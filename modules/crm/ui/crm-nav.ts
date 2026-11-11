// The CRM menu, laid out like the TAG-website CRM: grouped vertical sidebar. One list drives the sidebar,
// the page titles and who may see what.
import {
  BarChart3,
  Ban,
  CalendarDays,
  CheckSquare,
  Contact,
  Database,
  Eye,
  GitFork,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Lock,
  Megaphone,
  PieChart,
  Settings,
  Share2,
  Users,
  type LucideIcon,
} from 'lucide-react';

export const PAGES = [
  'overview',
  'work',
  'pool',
  'leads',
  'distribute',
  'pipeline',
  'care',
  'appointments',
  'customers',
  'orders',
  'marketing',
  'campaigns',
  'channels',
  'report',
  'config',
  'blocked',
  'viewlog',
] as const;
export type PageKey = (typeof PAGES)[number];

export type NavItem = { key: PageKey; label: string; hint: string; icon: LucideIcon; managerOnly?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const CRM_NAV: NavGroup[] = [
  {
    title: 'Làm việc',
    items: [
      { key: 'overview', label: 'Tổng quan', hint: 'Việc, lead mới, phễu và nguồn khách', icon: LayoutDashboard },
      { key: 'work', label: 'Bàn làm việc', hint: 'Khách cần gọi, lịch hẹn và việc hôm nay', icon: ListChecks },
      { key: 'pool', label: 'Kho số', hint: 'Lead chưa có người phụ trách', icon: Database },
      { key: 'leads', label: 'Danh sách lead', hint: 'Tìm, lọc và xử lý lead', icon: Users },
      { key: 'distribute', label: 'Chia lead', hint: 'Máy chia data theo nguồn và nhân viên', icon: GitFork },
      { key: 'pipeline', label: 'Pipeline', hint: 'Lead theo từng giai đoạn tư vấn', icon: KanbanSquare },
      { key: 'care', label: 'Việc của tôi', hint: 'Nhắc việc tự sinh và việc tạo tay', icon: CheckSquare },
      { key: 'appointments', label: 'Lịch hẹn', hint: 'Buổi trải nghiệm và lịch gặp khách', icon: CalendarDays },
    ],
  },
  {
    title: 'Khách hàng',
    items: [
      { key: 'customers', label: 'Khách hàng', hint: 'Hồ sơ, gói, lịch sử chơi và chăm sóc', icon: Contact },
      { key: 'orders', label: 'Đơn bán & Giữ chỗ', hint: 'Giữ chỗ, đặt cọc, thanh toán từng đợt', icon: Lock },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { key: 'marketing', label: 'Marketing', hint: 'Chiến dịch, chi phí, CPL và ROAS', icon: PieChart, managerOnly: true },
      { key: 'campaigns', label: 'Chiến dịch', hint: 'Gửi email, Zalo hàng loạt theo nhóm khách', icon: Megaphone, managerOnly: true },
      { key: 'channels', label: 'Kênh & tích hợp', hint: 'Website, Zalo, Facebook, quảng cáo', icon: Share2, managerOnly: true },
    ],
  },
  {
    title: 'Báo cáo',
    items: [{ key: 'report', label: 'Báo cáo', hint: 'Phễu, nguồn, nhân viên, lý do thất bại', icon: BarChart3, managerOnly: true }],
  },
  {
    title: 'Hệ thống',
    items: [
      { key: 'config', label: 'Cấu hình', hint: 'SLA, chia lead, giờ làm việc, nhân sự', icon: Settings, managerOnly: true },
      { key: 'blocked', label: 'Số bị chặn', hint: 'Số rác, đối thủ, số thử', icon: Ban, managerOnly: true },
      { key: 'viewlog', label: 'Nhật ký xem số', hint: 'Ai đã xem số điện thoại khách', icon: Eye, managerOnly: true },
    ],
  },
];

/** The menu this person may see; managers see everything, staff the working screens. Empty groups are dropped. */
export function visibleNav(manager: boolean): NavGroup[] {
  return CRM_NAV.map((g) => ({ ...g, items: g.items.filter((i) => manager || !i.managerOnly) })).filter((g) => g.items.length);
}

export const findItem = (key: string) => CRM_NAV.flatMap((g) => g.items).find((i) => i.key === key);
export const groupOf = (key: string) => CRM_NAV.find((g) => g.items.some((i) => i.key === key))?.title ?? '';

/** Old tab names (links, tests, bookmarks) -> the page to show. */
export function pageFor(name: string): PageKey {
  const map: Record<string, PageKey> = { files: 'customers', tasks: 'work' };
  const k = map[name] ?? name;
  return (PAGES as readonly string[]).includes(k) ? (k as PageKey) : 'work';
}
