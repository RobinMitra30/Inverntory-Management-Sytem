import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  FileDown, 
  CheckSquare, 
  ShieldAlert, 
  Truck, 
  Package,
  Users, 
  CircleDollarSign, 
  Cloud,
  ChevronDown,
  Settings,
  LayoutDashboard,
  Home,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';

export function ProjectSidebar() {
  const location = useLocation();
  const match = location.pathname.match(/\/projects\/([^/]+)/);
  const id = match ? match[1] : undefined;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const { profile } = useAuth();
  const isManagerOrAdmin = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER;

  const menuGroups = [
    {
      items: [
        { name: 'Project dashboard', href: `/projects/${id}`, icon: Building2 },
        { name: 'Reports', href: `/projects/${id}/reports`, icon: FileDown },
      ]
    },
    {
      title: 'PROGRESS & QUALITY',
      items: [
        { name: 'Tasks', href: `/projects/${id}/tasks`, icon: CheckSquare },
        { name: 'Progress (DPR)', href: `/projects/${id}/daily-reports-list`, icon: FileSpreadsheet },
        { name: 'Issues', href: `/projects/${id}/issues`, icon: ShieldAlert },
      ]
    },
    {
      title: 'MANAGE',
      items: [
        { 
          name: 'Material', 
          href: `/projects/${id}/requisitions`, 
          icon: Truck, 
          subItems: [
            { name: 'Requisitions', href: `/projects/${id}/requisitions` },
            ...(isManagerOrAdmin ? [{ name: 'Purchase Orders', href: `/projects/${id}/orders` }] : []),
            { name: 'GRNs', href: `/projects/${id}/grns` },
            ...(isManagerOrAdmin ? [{ name: 'Price History', href: `/material-price-history?projectId=${id}` }] : []),
          ]
        },
        { name: 'Site Inventory', href: `/projects/${id}/inventory`, icon: Package },
      ]
    }
  ];

  return (
    <div className="relative flex-shrink-0 group h-full">
      <div className="flex flex-col w-64 bg-[#c8e5e7]/60 border-r border-white/20 backdrop-blur-xl h-screen overflow-y-auto font-sans shadow-lg shadow-teal-950/2">
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer rounded-lg p-1 -ml-1">
            <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-teal-600">
              <Layers className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-slate-900 font-sans font-bold tracking-tight text-base leading-none">Sync Inventory</h1>
              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600/70 font-mono font-bold mt-1">by Structure Makers</p>
            </div>
          </Link>
          <NavLink 
            to="/projects" 
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white/30 rounded-full transition-colors h-8 w-8 flex items-center justify-center"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-6">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.title && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <span className="text-[9px] font-bold text-slate-500/80 uppercase tracking-widest leading-none">
                    {group.title}
                  </span>
                  <div className="h-[1px] flex-1 bg-white/20" />
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div
                      role="button"
                      onClick={() => item.subItems ? toggleItem(item.name) : undefined}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 group cursor-pointer relative",
                        location.pathname === item.href && !item.subItems
                          ? "bg-white text-slate-900 shadow-md shadow-slate-900/5 font-bold" 
                          : "text-slate-700/80 hover:bg-white/30 hover:text-slate-950"
                      )}
                    >
                      <NavLink
                        to={item.href}
                        className="flex-1 flex items-center gap-3"
                      >
                        <item.icon className={cn(
                          "w-4 h-4 transition-colors shrink-0",
                          location.pathname === item.href && !item.subItems ? "text-teal-600" : "text-slate-500 group-hover:text-slate-950"
                        )} />
                        <span>{item.name}</span>
                      </NavLink>
                      {(item.hasDropdown || item.subItems) && (
                        <ChevronDown className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          expandedItems.includes(item.name) ? "rotate-180" : ""
                        )} />
                      )}
                    </div>
                    
                    {item.subItems && expandedItems.includes(item.name) && (
                      <div className="ml-5 space-y-1 mt-1 border-l border-white/20 pl-3">
                        {item.subItems.map((subItem) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            className={({ isActive }) =>
                              cn(
                                "block py-1.5 px-3 text-xs font-semibold rounded-full transition-colors",
                                isActive 
                                  ? "bg-white/60 text-slate-900 font-bold shadow-xs" 
                                  : "text-slate-600 hover:text-slate-950 hover:bg-white/20"
                              )
                            }
                          >
                            {subItem.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
