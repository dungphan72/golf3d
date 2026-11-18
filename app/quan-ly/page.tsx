import '../admin.css';
import '../crm-shell.css';
import '../staff.css';
import ClubApp from '../ui/ClubApp';

export const metadata = { title: 'Quản lý — SiGolf', robots: { index: false } };

export default function Page() {
  return <ClubApp />;
}
