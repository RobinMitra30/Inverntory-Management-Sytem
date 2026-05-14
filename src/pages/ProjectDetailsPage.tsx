import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { ProjectService, TaskService, ProgressService } from '@/services/store';
import { Project, SiteTask, DailyReport, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Filter, 
  Info,
  Calendar,
  ChevronRight,
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

function DownloadReportDialog() {
  const { id } = useParams<{ id: string }>();
  const [reportType, setReportType] = useState<'detailed' | 'summary'>('detailed');
  const [duration, setDuration] = useState('today');
  const [open, setOpen] = useState(false);

  const handleCreateReport = async () => {
    try {
      toast.promise(
        ProgressService.add({
          projectId: id || '',
          date: new Date().toISOString(),
          supervisorId: 'Automated System',
          stockDetails: [],
          workDetails: [],
          workTimelines: [],
          workerDetails: [],
          issues: `Automated report: ${reportType} for ${duration}`,
          photoUrls: [],
          signature: 'Auto',
          status: 'SUBMITTED'
        }),
        {
          loading: 'Generating report...',
          success: 'Report created and saved to project records.',
          error: 'Failed to create report. Please check permissions.',
        }
      );
      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button 
          variant="outline" 
          className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 min-w-[100px]"
          onClick={() => setOpen(true)}
        >
          <Download className="w-4 h-4" />
          Report
        </Button>
      } />
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold">Download Progress Report</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Select report type</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setReportType('detailed')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  reportType === 'detailed' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className={`font-bold text-sm ${reportType === 'detailed' ? 'text-blue-700' : 'text-slate-900'}`}>Detailed report</p>
                <p className="text-xs text-slate-500 mt-1">Shows day-wise logs—useful for detailed tracking and records.</p>
              </button>
              <button 
                onClick={() => setReportType('summary')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  reportType === 'summary' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${reportType === 'summary' ? 'text-blue-700' : 'text-slate-900'}`}>Summary report</p>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">New</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Shows key summaries—great for quick updates and sharing.</p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Select Duration</h3>
            <div className="flex flex-wrap gap-6 items-center">
              {[
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7 Days' },
                { id: '15days', label: '15 Days' },
                { id: 'specific', label: 'Specific Date' }
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${duration === opt.id ? 'border-blue-600' : 'border-slate-300'}`}>
                    {duration === opt.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <input 
                    type="radio" 
                    className="hidden" 
                    name="duration" 
                    checked={duration === opt.id} 
                    onChange={() => setDuration(opt.id)} 
                  />
                  <span className={`text-sm font-medium ${duration === opt.id ? 'text-slate-900' : 'text-slate-500'}`}>{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-bold uppercase">From</Label>
                <div className="relative">
                  <Input type="text" defaultValue="11 May, 2026" className="h-10 pr-10" />
                  <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-bold uppercase">To</Label>
                <div className="relative">
                  <Input type="text" defaultValue="11 May, 2026" className="h-10 pr-10" />
                  <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 font-bold uppercase">Tags</Label>
              <Input placeholder="Enter tags" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 font-bold uppercase">Work Categories</Label>
              <Input placeholder="Enter categories" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 font-bold uppercase">Users</Label>
              <Input placeholder="Enter users" className="h-10" />
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-bold text-slate-700">Parts in the Report</h3>
            <div className="space-y-1 border-t divide-y">
              <div className="flex items-start justify-between py-4 group">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">Progress</p>
                  <p className="text-[10px] text-slate-400">Includes task progress, attendance, remarks & costing</p>
                </div>
                <Checkbox />
              </div>
              <div className="flex items-start justify-between py-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">Photos</p>
                  <p className="text-[10px] text-slate-400">Includes all photos</p>
                </div>
                <Checkbox />
              </div>
              <div className="flex items-start justify-between py-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">Issues</p>
                  <p className="text-[10px] text-slate-400">Includes all issues</p>
                </div>
                <Checkbox />
              </div>
              <div className="flex items-start justify-between py-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">Inventory</p>
                  <p className="text-[10px] text-slate-400">Includes used, added & in stock materials</p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="py-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">Material</p>
                    <p className="text-[10px] text-slate-400">Includes all Material Issued, Indents and Grn</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
                <div className="pl-6 space-y-3">
                  {['Issued', 'Indent', 'GRN', 'Site Transfer', 'Consumption', 'Purchase Order'].map(item => (
                    <div key={item} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 border-l border-b border-slate-300 -mt-2 rounded-bl-md" />
                        <span className="text-xs font-medium text-slate-600">{item}</span>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-4 pt-4 border-t sticky bottom-0 bg-white">
          <Button onClick={handleCreateReport} className="bg-blue-600 hover:bg-blue-700 px-8 py-6 rounded-lg font-bold text-base">
            Create Report
          </Button>
          <DialogClose render={
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:bg-slate-100 font-bold"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          } />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectDetailsPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const unsubProjects = ProjectService.subscribe((allProjects) => {
      const p = allProjects.find(item => item.id === id);
      if (p) setProject(p);
      setLoading(false);
    });

    const unsubTasks = TaskService.subscribe((allTasks) => {
      setTasks(allTasks.filter(t => t.projectId === id));
    });

    const unsubReports = ProgressService.subscribe((allReports) => {
      setReports(allReports.filter(r => r.projectId === id));
    });

    return () => {
      unsubProjects();
      unsubTasks();
      unsubReports();
    };
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-96">Loading project center...</div>;
  if (profile?.role === UserRole.SITE_SUPERVISOR && (!profile.assignedProjects || !profile.assignedProjects.includes(id || ''))) {
    return (
      <div className="flex items-center justify-center h-96 flex-col gap-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
          <Filter className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500">You do not have permission to view this project's workspace.</p>
        <Button onClick={() => navigate('/projects')}>Return to Project List</Button>
      </div>
    );
  }
  if (!project) return <div className="p-8 text-center text-slate-500">Project record not synchronized with central server.</div>;

  const notStartedCount = tasks.filter(t => t.status === 'TODO').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${id}/daily-report`)}>Daily Report</Button>
          <DownloadReportDialog />
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/projects/${id}/settings`)}>Project Settings</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm shadow-slate-200/50">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Project Status</h2>
                <Button variant="ghost" size="icon" className="text-slate-400 h-8 w-8">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-12">
                {/* Gauge */}
                <div className="relative w-48 h-24 overflow-hidden">
                  <svg className="w-48 h-48 absolute top-0">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="12"
                      strokeDasharray="251 251"
                      strokeDashoffset="251"
                      transform="rotate(-180 96 96)"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="transparent"
                      stroke={project.progress && project.progress > 0 ? "#fbbf24" : "#cbd5e1"}
                      strokeWidth="12"
                      strokeDasharray="251 251"
                      strokeDashoffset={251 - (251 * (project.progress || 0)) / 100}
                      transform="rotate(-180 96 96)"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                     <span className="text-2xl font-bold text-slate-900 leading-none">{project.progress || 0}%</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">complete</span>
                  </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <div className="grid grid-cols-1 gap-4 divide-y divide-slate-50">
                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <span className="text-xs font-bold text-slate-500">Actual Start - End Dates</span>
                          <Info className="w-3 h-3 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 mt-1">--</p>
                      </div>
                    </div>
                    <div className="pt-4 flex items-center justify-between group">
                      <div>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <span className="text-xs font-bold text-slate-500">Planned Start - End Dates</span>
                          <Info className="w-3 h-3 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {project.startDate} - {project.endDate || '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 mt-12 border-t border-slate-50">
                <div className="p-6 border-r border-slate-50">
                   <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-xs font-bold text-slate-800">Not Started</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total</p>
                        <p className="text-xl font-black text-slate-900 leading-none">{notStartedCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-red-300 uppercase tracking-tighter">Delayed</p>
                        <p className="text-xl font-black text-red-500 leading-none">0</p>
                      </div>
                   </div>
                </div>
                <div className="p-6 border-r border-slate-50">
                   <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-xs font-bold text-slate-800">In Progress</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total</p>
                        <p className="text-xl font-black text-slate-900 leading-none">{inProgressCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-red-300 uppercase tracking-tighter">Delayed</p>
                        <p className="text-xl font-black text-red-500 leading-none">0</p>
                      </div>
                   </div>
                </div>
                <div className="p-6">
                   <div className="flex items-center gap-1.5 mb-4">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-bold text-slate-800">Completed</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total</p>
                        <p className="text-xl font-black text-slate-900 leading-none">{completedCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-red-300 uppercase tracking-tighter">Delayed</p>
                        <p className="text-xl font-black text-red-500 leading-none">0</p>
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="border-none shadow-sm shadow-slate-200/50">
                <CardContent className="p-6">
                   <div className="flex justify-between items-center mb-12">
                      <h3 className="text-sm font-bold text-slate-700">Deadline Tasks</h3>
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                   </div>
                   <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-10 h-10 mb-3 opacity-10" />
                      <p className="text-[11px] font-bold text-slate-500">No deadline tasks found</p>
                      <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-widest font-black">All systems green</p>
                   </div>
                </CardContent>
             </Card>
             <Card className="border-none shadow-sm shadow-slate-200/50">
                <CardContent className="p-6">
                   <div className="flex justify-between items-center mb-12">
                      <h3 className="text-sm font-bold text-slate-700">Schedule Tasks</h3>
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                   </div>
                   <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <Calendar className="w-10 h-10 mb-3 opacity-10" />
                      <p className="text-[11px] font-bold text-slate-500">No scheduled tasks found</p>
                      <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-widest font-black">Calendar fully clear</p>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm shadow-slate-200/50 min-h-[500px] flex flex-col">
            <CardContent className="p-6 flex flex-col h-full">
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800">Recent progress updates</h3>
                  <NavLink to="/progress" className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                    View all updates <ChevronRight className="w-3 h-3" />
                  </NavLink>
               </div>
               <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">For {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
               </div>

               <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
                  <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start gap-8 px-0 h-10 mb-8">
                    <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent text-xs font-bold text-slate-400 data-[state=active]:text-blue-600 px-0 translate-y-[1px]">
                      Updates on tasks
                    </TabsTrigger>
                    <TabsTrigger value="remarks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent text-xs font-bold text-slate-400 data-[state=active]:text-blue-600 px-0 translate-y-[1px]">
                      Progress remarks
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks" className="flex-1 flex flex-col items-center justify-center text-center pb-20">
                     <p className="text-[11px] font-bold text-slate-800">No task updates today</p>
                     <p className="text-[10px] text-slate-400 leading-tight px-8 mt-2">Choose different dates from the calendar to see more updates</p>
                  </TabsContent>
                  <TabsContent value="remarks" className="flex-1 flex flex-col items-center justify-center text-center pb-20">
                     <p className="text-[11px] font-bold text-slate-800">No progress remarks recorded</p>
                     <p className="text-[10px] text-slate-400 leading-tight px-8 mt-2">Check back later or change the date filter</p>
                  </TabsContent>
               </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
