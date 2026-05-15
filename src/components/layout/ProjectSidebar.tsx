import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Building2, 
  FileDown, 
  ClipboardList, 
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
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const menuGroups = [
    {
      items: [
        { name: 'Project dashboard', href: `/projects/${id}`, icon: Building2 },
        { name: 'Reports', href: `/projects/${id}/reports`, icon: FileDown },
        { name: 'BOQ', href: `/projects/${id}/boq`, icon: ClipboardList },
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
            { name: 'Purchase Orders', href: `/projects/${id}/orders` },
            { name: 'GRNs', href: `/projects/${id}/grns` },
          ]
        },
        { name: 'Site Inventory', href: `/projects/${id}/inventory`, icon: Package },
        { name: 'Manpower', href: `/projects/${id}/manpower`, icon: Users },
        { name: 'Team', href: `/users`, icon: Users },
      ]
    },
    {
      title: 'FINANCIALS',
      items: [
        { name: 'Received amount', href: `/projects/${id}/financials`, icon: CircleDollarSign },
      ]
    },
    {
      title: 'OTHERS',
      items: [
        { name: 'Drive', href: `/projects/${id}/drive`, icon: Cloud },
      ]
    }
  ];

  return (
    <div className="relative flex-shrink-0 group">
      <div className="flex flex-col w-64 bg-white border-r border-slate-200 h-screen overflow-y-auto font-sans">
        <div className="p-6 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic">S</div>
            <div>
              <h1 className="text-slate-900 font-bold tracking-tight text-base">SiteFlow</h1>
            </div>
          </div>
          <NavLink 
            to="/projects" 
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.title && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {group.title}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-100" />
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div
                      role="button"
                      onClick={() => item.subItems ? toggleItem(item.name) : undefined}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                        location.pathname === item.href && !item.subItems
                          ? "bg-blue-50 text-blue-700 shadow-sm" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <NavLink
                        to={item.href}
                        className="flex-1 flex items-center gap-3"
                      >
                        <item.icon className={cn(
                          "w-5 h-5",
                          "group-hover:text-blue-600"
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
                      <div className="ml-9 space-y-1 mt-1 border-l border-slate-100 pl-3">
                        {item.subItems.map((subItem) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            className={({ isActive }) =>
                              cn(
                                "block py-1.5 text-xs font-medium transition-colors hover:text-blue-600",
                                isActive ? "text-blue-600 font-bold" : "text-slate-400"
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

        <div className="p-4 border-t border-slate-50">
          <NavLink
              to={`/projects/${id}/settings`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <Settings className="w-5 h-5" />
              <span>Project Settings</span>
            </NavLink>
        </div>
      </div>
      
    </div>
  );
}
