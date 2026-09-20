import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/hooks/useUserRole';

interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  roles?: UserRole[];
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { label: 'Banks', href: '/admin/banks', icon: '🏦', roles: ['admin'] },
  { label: 'Templates', href: '/admin/templates', icon: '📄', roles: ['admin'] },
  { label: 'Calibration', href: '/admin/calibration', icon: '📏' },
  { label: 'Users', href: '/admin/users', icon: '👥', roles: ['admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈', roles: ['admin'] },
  { label: 'Bank Editor', href: '/admin/bank-editor', icon: '✏️' },
  { label: 'Login', href: '/admin/login', icon: '🔑' },
];

interface SidebarProps {
  role: UserRole;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = sidebarItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="w-64 h-screen bg-nav text-nav-text overflow-y-auto">
      <div className="p-4 border-b border-nav-2">
        <h2 className="text-xl font-bold text-white">Reactify Admin</h2>
      </div>
      <nav className="mt-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-nav-active text-white'
                  : 'text-nav-text-dim hover:bg-nav-2 hover:text-nav-text'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

