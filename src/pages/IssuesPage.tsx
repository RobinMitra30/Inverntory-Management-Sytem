import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IssueService, ProjectService, ProgressService } from '@/services/store';
import { ProjectIssue, Project, DailyReport, UserRole } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Activity, 
  AlertOctagon, 
  FileText, 
  Users, 
  Calendar, 
  PlusCircle,
  Eye,
  Trash2,
  ListFilter
} from 'lucide-react';

export default function IssuesPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab ] = useState<'logged' | 'dpr'>('logged');

  // Form states for logging dynamic issues
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'MATERIAL' | 'LABOR' | 'WEATHER' | 'MACHINERY' | 'SAFETY' | 'OTHER'>('MATERIAL');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal states
  const [viewingIssue, setViewingIssue] = useState<ProjectIssue | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    const unsubIssues = IssueService.subscribe(setIssues);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubDailyReports = ProgressService.subscribe(setDailyReports);
    
    return () => {
      unsubIssues();
      unsubProjects();
      unsubDailyReports();
    };
  }, []);

  const getProjectDisplayName = (projectId: string, project?: Project): string => {
    const isRawId = (str?: string) => {
      if (!str) return true;
      if (str.includes(' ')) return false;
      return /^[a-zA-Z0-9_-]{5,30}$/.test(str);
    };
    if (project?.name && !isRawId(project.name)) {
      return project.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (project?.name && isRawId(project.name)) {
      return `Horizon Project (${project.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return project?.name || projectId || 'Grand Horizon Mall';
  };

  const project = projects.find(p => p.id === projectIdParam);
  const projectName = getProjectDisplayName(projectIdParam || '', project);

  const getPriorityColor = (prio: ProjectIssue['priority']) => {
    switch (prio) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 border-rose-200 font-mono font-bold';
      case 'HIGH': return 'bg-amber-100 text-amber-800 border-amber-200 font-mono';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200 font-mono';
      case 'LOW': return 'bg-slate-100 text-slate-800 border-slate-200 font-mono';
    }
  };

  const getCategoryIcon = (category: ProjectIssue['category']) => {
    return '⚠️';
  };

  // Filter Logged Issues
  const filteredLoggedIssues = issues
    .filter(issue => !projectIdParam || issue.projectId === projectIdParam)
    .filter(issue => {
      const matchesSearch = issue.title.toLowerCase().includes(search.toLowerCase()) || 
                            issue.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || issue.category === categoryFilter;
      const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

  // Collect DPR remarks that have actual issues
  const dprIssues = dailyReports
    .filter(rep => !projectIdParam || rep.projectId === projectIdParam)
    .filter(rep => rep.issues && typeof rep.issues === 'string' && rep.issues.trim() !== '')
    .map(rep => ({
      reportId: rep.id,
      date: rep.date,
      supervisorName: rep.supervisorName || 'Site Supervisor',
      issuesText: rep.issues,
      status: rep.status,
    }))
    .filter(dpr => {
      const issuesText = typeof dpr.issuesText === 'string' ? dpr.issuesText : '';
      const supervisorName = typeof dpr.supervisorName === 'string' ? dpr.supervisorName : '';
      return issuesText.toLowerCase().includes(search.toLowerCase()) || 
             supervisorName.toLowerCase().includes(search.toLowerCase());
    });

  const handleLogIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await IssueService.add({
        projectId: projectIdParam || 'demo-project',
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        status: 'OPEN',
        reportedBy: profile?.name || user?.email || 'Anonymous Team Member',
        assignedTo: newAssignedTo || undefined,
        createdAt: new Date().toISOString(),
      });
      
      toast.success('Site issue logged and broadcasted successfully.');
      setIsNewIssueOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewAssignedTo('');
    } catch (err) {
      toast.error('Failed to log issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveIssue = async () => {
    if (!viewingIssue) return;
    try {
      await IssueService.updateStatus(viewingIssue.id, 'RESOLVED', resolutionNote);
      toast.success('Issue marked as resolved.');
      setViewingIssue(null);
      setResolutionNote('');
    } catch (err) {
      toast.error('Failed to resolve issue.');
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this issue log?')) return;
    try {
      await IssueService.delete(id);
      toast.success('Issue log deleted.');
    } catch (err) {
      toast.error('Failed to delete issue.');
    }
  };

  // Calculations for stats block
  const openIssuesCount = issues.filter(i => (!projectIdParam || i.projectId === projectIdParam) && i.status === 'OPEN').length;
  const criticalCount = issues.filter(i => (!projectIdParam || i.projectId === projectIdParam) && i.priority === 'CRITICAL' && i.status === 'OPEN').length;
  const resolvedCount = issues.filter(i => (!projectIdParam || i.projectId === projectIdParam) && i.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-600 animate-pulse" />
            Project Issues & Blockers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time tracking of site hazards, delays, stockouts, and dependencies for <strong className="text-slate-800">{projectName}</strong>.
          </p>
        </div>
        <Button 
          onClick={() => setIsNewIssueOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-medium italic shadow-sm flex items-center gap-1 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Site Issue
        </Button>
      </div>

      {/* Grid Stats Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-white/90 border border-white/60 text-rose-600 rounded-2xl shadow-xs">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Blockers</p>
            <p className="text-3xl font-black text-slate-950 mt-1 leading-none">{openIssuesCount}</p>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-white/90 border border-white/60 text-amber-600 rounded-2xl shadow-xs">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Critical Severity</p>
            <p className="text-3xl font-black text-slate-950 mt-1 leading-none">{criticalCount}</p>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-white/90 border border-white/60 text-emerald-600 rounded-2xl shadow-xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resolved Logs</p>
            <p className="text-3xl font-black text-slate-950 mt-1 leading-none">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex border-b border-slate-200 gap-1 dev-tabs">
        <button
          onClick={() => setActiveTab('logged')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'logged' 
              ? 'border-rose-600 text-rose-600 font-serif italic' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Live Logged Blockers ({filteredLoggedIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('dpr')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'dpr' 
              ? 'border-rose-600 text-rose-600 font-serif italic' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> DPR Reported Issues & Remarks ({dprIssues.length})
        </button>
      </div>

      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder={activeTab === 'logged' ? "Search custom logs..." : "Search DPR site remarks..."} 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {activeTab === 'logged' && (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="MATERIAL">Material Delay</SelectItem>
                <SelectItem value="LABOR">Labor Issue</SelectItem>
                <SelectItem value="WEATHER">Weather Delay</SelectItem>
                <SelectItem value="MACHINERY">Equipment</SelectItem>
                <SelectItem value="SAFETY">Safety Issue</SelectItem>
                <SelectItem value="OTHER">Other Issues</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priority</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Render content depending on activeTab */}
      {activeTab === 'logged' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredLoggedIssues.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-semibold font-serif">No custom issue logs found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                No site blockers have been manually logged for this project matching your selection description.
              </p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto w-full hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-slate-800">Issue Details</TableHead>
                  <TableHead className="font-semibold text-slate-800">Category</TableHead>
                  <TableHead className="font-semibold text-slate-800">Severity</TableHead>
                  <TableHead className="font-semibold text-slate-800">Latest Status</TableHead>
                  <TableHead className="font-semibold text-slate-800">Reported By</TableHead>
                  <TableHead className="font-semibold text-slate-800 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoggedIssues.map((issue) => (
                  <TableRow key={issue.id} className="hover:bg-slate-50/50">
                    <TableCell className="max-w-md">
                      <p className="font-bold text-slate-900">{issue.title}</p>
                      <p className="text-slate-500 text-sm line-clamp-2 mt-0.5">{issue.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1 hover:text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Logged on: {new Date(issue.createdAt).toLocaleString()}
                      </p>
                      {issue.resolutionNotes && (
                        <div className="mt-2 bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-650">
                          <strong className="font-semibold text-emerald-900">Resolution Status Notes:</strong> {issue.resolutionNotes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase bg-slate-50/50 text-slate-600 font-mono font-medium py-1 px-2">
                        {getCategoryIcon(issue.category)} {issue.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getPriorityColor(issue.priority)} py-1 px-2`}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.status === 'RESOLVED' ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold font-mono">
                          <CheckCircle className="w-4 h-4" /> RESOLVED
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold font-mono animate-pulse">
                          <Clock className="w-4 h-4" /> ACTIVE OPEN
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800">{issue.reportedBy}</p>
                          {issue.assignedTo && (
                            <p className="text-xs text-blue-600 font-mono mt-0.5">→ Assignee: {issue.assignedTo}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setViewingIssue(issue)}
                        className="text-slate-600 hover:text-rose-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER) && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="text-slate-400 hover:text-red-650 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            
            {/* Mobile View */}
            <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50">
              {filteredLoggedIssues.map(issue => (
                <div key={issue.id} className="bg-white border text-sm border-slate-100 p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <p className="font-bold text-slate-900">{issue.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(issue.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${getPriorityColor(issue.priority)} py-0.5 px-2`}>
                      {issue.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-slate-500 text-sm line-clamp-3">{issue.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] uppercase bg-slate-50 text-slate-600 font-mono">
                      {getCategoryIcon(issue.category)} {issue.category}
                    </Badge>
                    {issue.status === 'RESOLVED' ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3 mr-1" /> RESOLVED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold">
                        <Clock className="w-3 h-3 mr-1" /> ACTIVE OPEN
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 bg-slate-50 p-2 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-800">{issue.reportedBy}</p>
                      {issue.assignedTo && <p className="text-[10px] text-blue-600 font-mono mt-0.5">Assigned: {issue.assignedTo}</p>}
                    </div>
                  </div>
                  
                  {issue.resolutionNotes && (
                    <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-650">
                      <strong className="font-semibold">Resolution:</strong> {issue.resolutionNotes}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-orange-200 hover:text-orange-600 bg-white" onClick={() => setViewingIssue(issue)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                    </Button>
                    {(profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER) && (
                      <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-red-200 hover:text-red-700 bg-white" onClick={() => handleDeleteIssue(issue.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {dprIssues.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-semibold font-serif">No reported daily issues found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Excellent! Supervisors recorded zero blockers/issues inside Project Daily Progress Reports for the current filter.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 leading-relaxed font-mono">
                💡 <strong>Historical Context:</strong> Submissions in this section originate from the Daily Progress Reports (DPR) logs written on the ground. Use them to match with scheduled work schedules.
              </p>

              <div className="overflow-x-auto w-full hidden md:block">
              <Table compact>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-850 w-32">DPR Date</TableHead>
                    <TableHead className="font-semibold text-slate-850">Supervisor In-Charge</TableHead>
                    <TableHead className="font-semibold text-slate-850">Site Remarks & Concerns</TableHead>
                    <TableHead className="font-semibold text-slate-850">DPR Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dprIssues.map((dpr, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-sm font-semibold text-slate-900 border-r border-slate-100">
                        {dpr.date}
                      </TableCell>
                      <TableCell className="text-slate-800 font-medium">
                        {dpr.supervisorName}
                      </TableCell>
                      <TableCell className="max-w-2xl text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                        {dpr.issuesText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs select-none lowercase italic font-mono bg-slate-50 text-slate-600">
                          {dpr.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex flex-col gap-4">
                {dprIssues.map((dpr, idx) => (
                  <div key={idx} className="bg-white border text-sm border-slate-100 p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <p className="font-mono text-sm font-semibold text-slate-900">{dpr.date}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {dpr.supervisorName}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] select-none lowercase italic font-mono bg-slate-50 text-slate-600">
                        {dpr.status}
                      </Badge>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-lg">
                      <span className="text-[10px] uppercase text-rose-400 font-bold tracking-widest block mb-1 font-mono">Remarks & Concerns</span>
                      <p className="text-slate-700 leading-relaxed text-xs whitespace-pre-wrap font-medium">{dpr.issuesText}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      )}

      {/* dialog for Logging New Issue */}
      <Dialog open={isNewIssueOpen} onOpenChange={setIsNewIssueOpen}>
        <DialogContent className="sm:max-w-[480px] font-sans">
          <form onSubmit={handleLogIssue} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-serif italic text-rose-700 flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                Log Site Issue / Blocker
              </DialogTitle>
              <DialogDescription>
                Submit a hazard, outage, or roadblock to inform all stakeholders.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="issueTitle">Issue Title</Label>
                <Input 
                  id="issueTitle" 
                  placeholder="e.g. Concrete supplier dispatch delayed" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 font-sans">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newCategory} 
                    onValueChange={(val: any) => setNewCategory(val)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MATERIAL">Material Outage</SelectItem>
                      <SelectItem value="LABOR">Labor Shortage</SelectItem>
                      <SelectItem value="MACHINERY">Machinery Fault</SelectItem>
                      <SelectItem value="WEATHER">Heavy Rain / Weather</SelectItem>
                      <SelectItem value="SAFETY">Safety Hazard</SelectItem>
                      <SelectItem value="OTHER">Other Blockage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority">Severity / Priority</Label>
                  <Select 
                    value={newPriority} 
                    onValueChange={(val: any) => setNewPriority(val)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical (Blocks Site)</SelectItem>
                      <SelectItem value="HIGH">High Severity</SelectItem>
                      <SelectItem value="MEDIUM">Medium / Warning</SelectItem>
                      <SelectItem value="LOW">Low / Advisory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="assignedTo">Assign To (Optional)</Label>
                <Input 
                  id="assignedTo" 
                  placeholder="e.g. Procurement Manager or Vendor Name" 
                  value={newAssignedTo} 
                  onChange={e => setNewAssignedTo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc">Detailed Description & Blockage Context</Label>
                <Textarea 
                  id="desc" 
                  placeholder="Describe the blocker, current impact on activities, and needed intervention..." 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  rows={4}
                  className="rounded-xl resize-none"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsNewIssueOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                {isSubmitting ? 'Submitting...' : 'Log Issue Now'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for Viewing Issue details & Resolving */}
      <Dialog open={viewingIssue !== null} onOpenChange={() => setViewingIssue(null)}>
        <DialogContent className="sm:max-w-[500px] font-sans">
          {viewingIssue && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${getPriorityColor(viewingIssue.priority)}`}>
                    {viewingIssue.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs uppercase bg-slate-50 text-slate-600 font-mono">
                    {viewingIssue.category}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold font-serif text-slate-900 leading-tight">
                  {viewingIssue.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-slate-400 mt-1">
                  Reported by {viewingIssue.reportedBy} on {new Date(viewingIssue.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {viewingIssue.description}
              </div>

              {viewingIssue.assignedTo && (
                <div className="text-sm font-mono flex items-center gap-1.5 text-blue-700 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  🛡️ <strong>Assigned Representative:</strong> {viewingIssue.assignedTo}
                </div>
              )}

              {viewingIssue.status === 'RESOLVED' ? (
                <div className="space-y-2 bg-emerald-50/85 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-800 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> ISSUE RESOLVED
                  </div>
                  {viewingIssue.resolutionNotes && (
                    <div className="text-xs text-emerald-950 font-sans mt-1">
                      <strong className="font-semibold text-emerald-900 block mb-0.5">Resolution Notes:</strong>
                      {viewingIssue.resolutionNotes}
                    </div>
                  )}
                  {viewingIssue.resolvedAt && (
                    <p className="text-[10px] text-emerald-600 font-mono block mt-1">
                      Resolved on: {new Date(viewingIssue.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="resolutionNote" className="font-semibold text-slate-800 text-sm">
                      Provide Resolution Notes <span className="text-xs text-slate-400">(Required to resolve)</span>
                    </Label>
                    <Textarea 
                      id="resolutionNote"
                      placeholder="Explain how the issue/roadblock was resolved, actions taken, or safety clearance criteria..."
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      rows={3}
                      className="rounded-xl font-sans resize-none text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setViewingIssue(null)}
                      className="rounded-xl text-xs"
                    >
                      Close View
                    </Button>
                    <Button 
                      type="button" 
                      disabled={!resolutionNote.trim()}
                      onClick={handleResolveIssue}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Mark as Resolved & Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
