import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, ChevronRight, Headphones, Plus, HelpCircle, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/store';
import { Project } from '@/types';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  
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

  const path = location.pathname.split('/').slice(-1)[0] || 'Dashboard';
  const title = path.charAt(0).toUpperCase() + path.slice(1);

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 z-10 sticky top-0 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-2 md:gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-slate-900">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="hidden md:flex h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors rounded-xl"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden min-[400px]:block md:block" />
        {project ? (
          <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold text-slate-800">
            <span className="text-slate-500 hidden sm:inline font-medium">SiteFlow demo organisation</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <div className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors group">
              <span className="truncate max-w-[120px] sm:max-w-none">{project.name}</span>
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-slate-400 group-hover:text-slate-600" />
            </div>
          </div>
        ) : (
          <h2 className="text-sm md:text-base font-bold tracking-tight text-slate-800">/ {title}</h2>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 mr-2 md:mr-4">
          <Button variant="ghost" size="icon" className="text-primary rounded-full h-9 w-9 bg-primary/10">
            <Headphones className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white rounded-xl h-9 w-9 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-orange-100/50 text-orange-600 flex items-center justify-center text-xs font-bold border border-orange-200">
            9
          </div>
        </div>
        
        <div className="relative w-72 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            type="search" 
            placeholder="Search across project data..." 
            className="pl-10 h-10 bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-xs"
          />
        </div>
      </div>
    </header>
  );
}
