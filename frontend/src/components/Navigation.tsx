import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Upload,
  BarChart3,
  Users,
  Settings,
  TrendingUp,
  UserCheck,
  FolderOpen,
  LogOut
} from 'lucide-react';

export function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Indicators', href: '/indicators', icon: TrendingUp },
    { name: 'Attendance', href: '/attendance', icon: UserCheck },
    { name: 'Database', href: '/database', icon: Users },
    { name: 'Files', href: '/files', icon: FolderOpen },
    { name: 'Admin', href: '/admin', icon: Settings },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-xl font-bold">Event Registration Platform</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* User info and logout */}
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <span className="text-sm text-gray-600">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}