import React from 'react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Box, 
  Briefcase, 
  ClipboardList, 
  FileCheck, 
  LayoutDashboard, 
  LogOut, 
  Package, 
  Settings, 
  ShoppingCart, 
  Truck, 
  Users,
  CheckSquare,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.STORE_KEEPER, UserRole.QUALITY_ENGINEER, UserRole.ACCOUNTANT] },
  { name: 'Progress (DPR)', href: '/all-daily-reports', icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR] },
  { name: 'Site Tasks', href: '/tasks', icon: CheckSquare, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.QUALITY_ENGINEER] },
  { name: 'Projects', href: '/projects', icon: Briefcase, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR] },
  { name: 'Products', href: '/products', icon: Package, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER] },
  { name: 'Inventory', href: '/inventory', icon: Box, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER] },
  { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
  { name: 'GRNs', href: '/grns', icon: FileCheck, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.QUALITY_ENGINEER] },
  { name: 'Vendors', href: '/vendors', icon: Truck, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
  { name: 'Team Management', href: '/users', icon: Users, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
  { name: 'Admin', href: '/admin', icon: Settings, roles: [UserRole.ADMIN] },
];

export function Sidebar() {
  const { profile, logout } = useAuth();

  const isDev = profile?.email === 'structuremakers.india@gmail.com' || profile?.email === 'robin.mitra124421@gmail.com';
  
  const filteredNavigation = React.useMemo(() => navigation.filter(
    (item) => !profile || item.roles.includes(profile.role) || (isDev && item.name === 'Admin')
  ), [profile, isDev]);

  return (
    <div className="flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen overflow-y-auto font-sans">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold italic shadow-lg shadow-primary/20">S</div>
        <div>
          <h1 className="text-white font-heading font-bold tracking-tight text-xl">SiteFlow</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-mono font-bold leading-none">by Structure Makers</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.href + item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 group relative",
                isActive 
                  ? "bg-primary/10 text-primary font-semibold" 
                  : "hover:bg-sidebar-accent hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, scaleY: 0.5 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    className="absolute left-0 w-1 h-5 bg-primary rounded-full"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-white")} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 shadow-inner">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{profile?.name || 'User'}</p>
              <p className="text-[10px] text-sidebar-foreground/40 uppercase font-mono tracking-wider">{profile?.role?.replace(/_/g, ' ') || 'Loading...'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full justify-start gap-3 text-sidebar-foreground/40 hover:text-white hover:bg-white/5 h-10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
