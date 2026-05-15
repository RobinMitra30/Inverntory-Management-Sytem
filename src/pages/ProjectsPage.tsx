import React, { useState, useEffect } from 'react';
import { ProjectService } from '@/services/store';
import { Project, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { NavLink } from 'react-router-dom';
import { 
  Plus, 
  MapPin, 
  Search, 
  Download, 
  Filter, 
  ChevronDown, 
  Building2, 
  Phone, 
  Image as ImageIcon, 
  Zap, 
  MoreVertical 
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const [newProject, setNewProject] = useState<Omit<Project, 'id'>>({
    name: '',
    location: '',
    status: 'ACTIVE',
    budget: 0,
    managerId: '',
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    return ProjectService.subscribe(setProjects);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ProjectService.add(newProject);
      setIsAddOpen(false);
      toast.success('Project initiated successfully');
      setNewProject({
        name: '',
        location: '',
        status: 'ACTIVE',
        budget: 0,
        managerId: '',
        progress: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      toast.error('Failed to create project');
    }
  };

  const [showDemo, setShowDemo] = useState(() => {
    return localStorage.getItem('erp_demo_mode') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('erp_demo_mode', String(showDemo));
    // Trigger a storage event for other components to listen
    window.dispatchEvent(new Event('storage'));
  }, [showDemo]);

  const filteredProjects = projects.filter(p => {
    // 1. Role-based Project Access logic
    if (profile?.role === UserRole.SITE_SUPERVISOR) {
       const isAssigned = profile.assignedProjects?.includes(p.id) || false;
       if (!isAssigned) return false;
    }

    // 2. Search & Filter logic
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDemo = showDemo || !p.isDemo;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    
    return matchesSearch && matchesDemo && matchesStatus;
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 border-b border-slate-200/60 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-heading">
              Active Projects
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 px-3 py-1 rounded-lg font-bold">
                 {filteredProjects.length} Total
              </Badge>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] cursor-pointer flex items-center gap-2 hover:text-primary transition-colors">
                <input 
                  type="checkbox" 
                  checked={showDemo} 
                  onChange={e => setShowDemo(e.target.checked)}
                  className="rounded-md border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                Include Demo Data
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger render={
                <Button className="bg-primary hover:bg-primary/90 h-12 px-6 gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95">
                  <Plus className="w-5 h-5" /> New Project
                </Button>
              } />
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-heading font-bold">Initiate Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Name</Label>
                    <Input id="name" className="h-11 rounded-xl" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Skyline Residencies Ph 1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-slate-500">Site Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input id="location" className="pl-10 h-11 rounded-xl" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} placeholder="City, State" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</Label>
                      <Input id="startDate" className="h-11 rounded-xl" type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</Label>
                      <Input id="endDate" className="h-11 rounded-xl" type="date" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget (₹)</Label>
                      <Input id="budget" className="h-11 rounded-xl" type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: Number(e.target.value)})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-slate-500">Initial Status</Label>
                       <Select 
                         value={newProject.status} 
                         onValueChange={(v: any) => setNewProject({...newProject, status: v})}
                       >
                         <SelectTrigger className="h-11 rounded-xl">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl">
                           <SelectItem value="ACTIVE">Active</SelectItem>
                           <SelectItem value="ON_HOLD">On Hold</SelectItem>
                           <SelectItem value="COMPLETED">Completed</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl mt-6 font-bold tracking-wide">Create Project</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="h-12 px-6 gap-2 text-slate-600 border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by project name or site location..." 
              className="pl-11 bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all h-11 rounded-xl text-sm" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <Select value={selectedStatus} onValueChange={setSelectedStatus}>
               <SelectTrigger className="w-[180px] h-11 rounded-xl">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent className="rounded-xl">
                 <SelectItem value="all">All Status</SelectItem>
                 <SelectItem value="ACTIVE">Active</SelectItem>
                 <SelectItem value="ON_HOLD">On Hold</SelectItem>
                 <SelectItem value="COMPLETED">Completed</SelectItem>
               </SelectContent>
             </Select>
             <Button variant="outline" className="flex-1 md:flex-none h-11 px-6 gap-2 text-slate-600 border-slate-200 rounded-xl hover:bg-slate-50" onClick={() => {setSearchTerm(''); setSelectedStatus('all')}}>
               <Filter className="w-4 h-4" /> Reset
             </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProjects.map((project) => (
          <NavLink 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="group bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 block relative"
          >
             {/* Thumbnail Area */}
             <div className="bg-slate-100 h-40 relative flex items-center justify-center overflow-hidden">
                <Building2 className="w-16 h-16 text-slate-200 transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute top-4 right-4 flex gap-2">
                   <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      <Phone className="w-4 h-4 text-slate-600" />
                   </div>
                   <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                   </div>
                </div>
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white text-primary hover:bg-white text-[10px] font-black uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-lg">
                    {project.status || 'Active'}
                  </Badge>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900/5 to-transparent"></div>
             </div>

             {/* Content Area */}
             <div className="p-6 space-y-6">
                <div className="flex justify-between items-start gap-4">
                   <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                     {project.name}
                   </h3>
                   {/* Progress Indicator */}
                   <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          className="text-slate-100"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={125.6}
                          strokeDashoffset={125.6 - (125.6 * (project.progress || 0)) / 100}
                          strokeLinecap="round"
                          className="text-primary transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black">{project.progress || 0}%</span>
                   </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                   <MapPin className="w-3.5 h-3.5" />
                   <p className="text-xs font-semibold truncate">{project.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                   <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Timeline</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{project.startDate?.split('-').reverse().join('/') || '11/05/2026'} - {project.endDate?.split('-').reverse().join('/') || '10/05/2027'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Budget</p>
                      <p className="text-xs font-bold text-slate-900 mt-1">₹{(project.budget / 100000).toFixed(1)}L</p>
                   </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 text-primary rounded-xl border border-primary/10 text-[10px] font-black uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-all">
                      <Zap className="w-3 h-3 fill-current" />
                      Dive in
                      <ChevronDown className="w-3 h-3 opacity-50 rotate-[270deg]" />
                   </div>
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                      <MoreVertical className="w-5 h-5" />
                   </Button>
                </div>
             </div>
          </NavLink>
        ))}
        {filteredProjects.length === 0 && (
           <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
             <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-slate-500 font-bold text-lg">No projects match your search</p>
             <p className="text-slate-400 text-sm mt-1">Try refining your search terms or filters.</p>
             <Button variant="ghost" onClick={() => setSearchTerm('')} className="mt-6 text-primary font-bold">Clear Filters</Button>
           </div>
        )}
      </div>
    </div>
  );
}
