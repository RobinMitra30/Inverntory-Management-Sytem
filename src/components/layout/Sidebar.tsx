import React from 'react';
import { motion } from 'motion/react';
import { NavLink, Link } from 'react-router-dom';
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
  FileSpreadsheet,
  History,
  RotateCcw,
  ChevronDown,
  Layers,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.STORE_KEEPER, UserRole.QUALITY_ENGINEER, UserRole.ACCOUNTANT] },
  { name: 'Progress (DPR)', href: '/all-daily-reports', icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR] },
  { name: 'Site Tasks', href: '/tasks', icon: CheckSquare, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.QUALITY_ENGINEER] },
  { name: 'Projects', href: '/projects', icon: Briefcase, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR] },
  { name: 'Products', href: '/products', icon: Package, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER] },
  { 
    name: 'Material Management', 
    icon: Box, 
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.ACCOUNTANT, UserRole.SITE_SUPERVISOR],
    children: [
      { name: 'Inventory Dashboard', href: '/inventory/dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.ACCOUNTANT] },
      { name: 'Site Inventory', href: '/inventory/control', icon: Box, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.SITE_SUPERVISOR] },
      { name: 'Stock Audit', href: '/inventory/movements', icon: History, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.SITE_SUPERVISOR] },
      { name: 'Material Reqs (MR)', href: '/material-requirements', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.STORE_KEEPER] },
      { name: 'Return Management', href: '/inventory/returns', icon: RotateCcw, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.SITE_SUPERVISOR] },
      { name: 'Requisitions', href: '/requisitions', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER] },
      { name: 'Orders (PO)', href: '/orders', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
      { name: 'GRNs', href: '/grns', icon: FileCheck, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_KEEPER, UserRole.QUALITY_ENGINEER] },
      { name: 'Price History', href: '/material-price-history', icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
      { name: 'Procurement AI', href: '/procurement-intelligence', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER] },
    ]
  },
  { name: 'Vendors', href: '/vendors', icon: Truck, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
  { name: 'Team Management', href: '/users', icon: Users, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ACCOUNTANT] },
  { 
    name: 'Admin', 
    icon: Settings, 
    roles: [UserRole.ADMIN],
    children: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: [UserRole.ADMIN] },
      { name: 'Data Management', href: '/admin/data-management', icon: Trash2, roles: [UserRole.ADMIN] },
    ]
  },
];

export function Sidebar() {
  const { profile, logout } = useAuth();
  const [openGroups, setOpenGroups] = React.useState<string[]>(['Material Management']);

  const isDev = profile?.email === 'structuremakers.india@gmail.com' || profile?.email === 'robin.mitra124421@gmail.com';
  
  const toggleGroup = (name: string) => {
    setOpenGroups(prev => 
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );
  };

  const filteredNavigation = React.useMemo(() => {
    return navigation.filter((item) => {
      const hasRole = !profile || item.roles.includes(profile.role) || (isDev && item.name === 'Admin');
      return hasRole;
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => !profile || child.roles.includes(profile.role))
        };
      }
      return item;
    });
  }, [profile, isDev]);

  return (
    <div className="flex flex-col w-64 bg-[#c8e5e7]/60 border-r border-white/20 backdrop-blur-xl h-screen overflow-y-auto font-sans shadow-lg shadow-teal-950/2">
      <Link to="/dashboard" className="p-6 flex items-center gap-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
        <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-teal-600">
          <Layers className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-slate-900 font-sans font-bold tracking-tight text-lg leading-none">Sync Inventory</h1>
          <p className="text-[9px] uppercase tracking-[0.15em] text-slate-600/70 font-mono font-bold mt-1">by Structure Makers</p>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {filteredNavigation.map((item) => {
          if (item.children) {
            const isOpen = openGroups.includes(item.name);
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all duration-300 group",
                    isOpen 
                      ? "bg-white/40 text-slate-900 font-bold" 
                      : "text-slate-700/80 hover:bg-white/30 hover:text-slate-950"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 transition-colors shrink-0", isOpen ? "text-teal-600" : "text-slate-500/80 group-hover:text-slate-950")} />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-300 shrink-0", isOpen ? "rotate-180 text-teal-600" : "text-slate-400")} />
                </button>
                
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden bg-white/10 rounded-2xl mx-1"
                  >
                    <div className="py-1 px-2 space-y-0.5">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-4 py-2 rounded-full text-xs transition-all duration-300 group",
                              isActive 
                                ? "bg-white text-slate-900 font-bold shadow-sm" 
                                : "text-slate-600 hover:text-slate-900 hover:bg-white/20"
                            )
                          }
                        >
                          <child.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-slate-500" />
                          <span>{child.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.href + item.name}
              to={item.href!}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all duration-300 group relative",
                  isActive 
                    ? "bg-white text-slate-900 font-bold shadow-md shadow-slate-900/5" 
                    : "text-slate-700/80 hover:bg-white/30 hover:text-slate-950"
                )
              }
            >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-teal-600" : "text-slate-500 group-hover:text-slate-950")} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        )})}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-white/30 rounded-2xl p-4 border border-white/40 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-sm font-bold text-teal-600 border border-white/25">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.name || 'User'}</p>
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{profile?.role?.replace(/_/g, ' ') || 'Loading...'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full justify-start gap-3 text-slate-500 hover:text-slate-900 hover:bg-white/40 h-10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold">Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
