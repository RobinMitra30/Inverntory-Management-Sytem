import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, ChevronRight, Headphones, Plus, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/store';
import { Project } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const match = location.pathname.match(/\/projects\/([^/]+)/);
  const projectId = match ? match[1] : null;

  useEffect(() => {
    if (projectId && projectId !== 'new') {
      const unsub = ProjectService.subscribe(projects => {
        const found = projects.find(p => p.id === projectId);
        if (found) setProject(found);
      });
      return unsub;
    } else {
      setProject(null);
    }
  }, [projectId]);

  useEffect(() => {
    if (!profile?.uid) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', profile.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    });
    return () => unsub();
  }, [profile?.uid]);

  const getHumanReadableTitle = (pathname: string): string => {
    if (pathname === '/') return 'Dashboard';
    
    // Check daily reports details
    if (pathname.startsWith('/daily-reports/')) {
      const id = pathname.split('/').pop() || '';
      return `Daily Report Details (#${id.slice(-6).toUpperCase()})`;
    }
    
    // Project specific nested routes
    if (pathname.startsWith('/projects/')) {
      const parts = pathname.split('/');
      if (parts.length <= 3) {
        return 'Project Dashboard';
      }
      if (parts.length > 3) {
        const section = parts[3];
        switch (section) {
          case 'settings': return 'Project Settings';
          case 'daily-report': return 'New Daily Report';
          case 'daily-reports-list': return 'Daily Reports';
          case 'reports': return 'Project Reports';
          case 'tasks': return 'Project Tasks';
          case 'progress': return 'Project Progress';
          case 'inventory': return 'Project Inventory';
          case 'requisitions': return 'Project Requisitions';
          case 'orders': return 'Project Purchase Orders';
          case 'grns': return 'Project GRNs';
          case 'issues': return 'Project Issues';
          default: return section.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
      }
    }

    // Exact catalog match
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const mappings: Record<string, string> = {
        'all-daily-reports': 'All Daily Reports',
        'vendors': 'Vendors & Suppliers',
        'requisitions': 'Material Requisitions',
        'orders': 'Purchase Orders',
        'grns': 'Goods Received Notes (GRN)',
        'inventory': 'Master Stock Inventory',
        'dashboard': 'Inventory Insights',
        'control': 'Inventory Control',
        'movements': 'Stock Ledger Movements',
        'returns': 'Returns & Reclamation',
        'reports': 'General Reports & Metrics',
        'users': 'User Management',
        'admin': 'System Administration',
        'progress': 'Progress Tracking',
        'tasks': 'Task Board',
        'products': 'Material & Product Catalog',
        'issues': 'Issues & Snags'
      };
      if (mappings[last]) return mappings[last];
      return last.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    if (pathname === '/material-requirements') return 'Material Requirements';
    if (pathname.startsWith('/material-requirements/')) return 'Requirement Details';
    
    return 'Dashboard';
  };

  const title = getHumanReadableTitle(location.pathname);

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-2 md:gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden text-slate-700 hover:text-slate-900 bg-white/30 rounded-xl h-9 w-9">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="hidden md:flex h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-colors rounded-xl"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-[1px] h-6 bg-slate-300 mx-1 hidden min-[400px]:block md:block" />
        {project ? (
          <div className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs lg:text-sm font-bold text-slate-900">
            <span className="text-slate-600 hidden lg:inline font-medium">Inventory Management demo organisation</span>
            <span className="text-slate-400 hidden lg:inline">/</span>
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-white/40 px-2 py-1 rounded-lg transition-colors group"
              onClick={() => navigate(`/projects/${project.id}`)}
              title="Go to project dashboard"
            >
              <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-none">{project.name}</span>
            </div>
            {title !== 'Project Dashboard' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-bold truncate max-w-[100px] sm:max-w-none">{title}</span>
              </>
            )}
          </div>
        ) : (
          <h2 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-slate-900 font-sans">/ {title}</h2>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 mr-2 md:mr-4">
          <Button variant="ghost" size="icon" className="text-teal-700 rounded-full h-9 w-9 bg-white/40 border border-white/20">
            <Headphones className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white rounded-xl h-9 w-9 bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/10">
            <Plus className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 rounded-xl h-9 w-9 bg-white/40 border border-white/20 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        <div className="relative w-72 hidden lg:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            type="search" 
            placeholder="Search..." 
            className="pl-10 h-10 w-full bg-white/40 border border-white/40 text-slate-900 placeholder:text-slate-500/70 focus:bg-white/80 focus:ring-2 focus:ring-teal-500/20 rounded-full text-xs shadow-inner"
          />
        </div>
      </div>
    </header>
  );
}
