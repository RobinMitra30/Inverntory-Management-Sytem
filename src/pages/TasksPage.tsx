import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Flag, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  X,
  FileText,
  Bookmark,
  Sparkles,
  ClipboardCheck,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { TaskService, ProjectService, UserService } from '@/services/store';
import { SiteTask, Project, UserProfile, UserRole } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';

function safeFormatDate(dateValue: any, fmt: string = 'dd MMM yyyy'): string {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  if (isNaN(parsed.getTime())) {
    return 'N/A';
  }
  try {
    return format(parsed, fmt);
  } catch (error) {
    return 'N/A';
  }
}

export default function TasksPage() {
  const { profile } = useAuth();
  
  // ROLE DERIVATIONS
  const isManagerOrAdmin = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER;
  const canChangeDueDate = profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.ADMIN;

  // LIVE DATABASE SUBSCRIPTIONS
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  // CONTROLLING DETAIL / EDIT DIALOG STATE
  const [selectedTask, setSelectedTask] = useState<SiteTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // LIVE SELECTED TASK DERIVATION
  const liveSelectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTask?.id) || selectedTask;
  }, [tasks, selectedTask]);

  // EDIT STATE FIELDS
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<SiteTask['priority']>('LOW');
  const [editStatus, setEditStatus] = useState<SiteTask['status']>('TODO');

  // CONTROLLING CREATE DIALOG STATE
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // CREATE STATE FIELDS
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<SiteTask['priority']>('MEDIUM');

  // SUBSCRIBE TO FIRESTORE DATA
  useEffect(() => {
    const unsubTasks = TaskService.subscribe(setTasks);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubUsers = UserService.subscribe(setUsers);

    return () => {
      unsubTasks();
      unsubProjects();
      unsubUsers();
    };
  }, []);

  // OPEN EDIT TASK DIALOG
  const handleOpenEdit = (task: SiteTask) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditAssignedTo(task.assignedTo || '');
    setEditProjectId(task.projectId || '');
    setEditDueDate(task.dueDate || '');
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setIsDetailOpen(true);
  };

  // UPDATE STATUS DIRECTLY VIA CHECKBOX CLICK
  const handleToggleStatus = async (e: React.MouseEvent, task: SiteTask) => {
    e.stopPropagation(); // prevent opening details
    const targetStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    await TaskService.updateStatus(task.id, targetStatus);
  };

  // CREATE NEW TASK SUBMISSION
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const taskPayload: Omit<SiteTask, 'id'> = {
      title: newTitle,
      description: newDescription,
      assignedTo: newAssignedTo,
      projectId: newProjectId,
      dueDate: newDueDate,
      priority: newPriority,
      status: 'TODO',
      createdBy: profile?.name || profile?.email || 'System user',
      createdAt: new Date().toISOString()
    };

    await TaskService.add(taskPayload);
    setIsCreateOpen(false);
    
    // Clear state
    setNewTitle('');
    setNewDescription('');
    setNewAssignedTo('');
    setNewProjectId('');
    setNewDueDate('');
    setNewPriority('MEDIUM');
  };

  // SAVE UPDATED TASK
  const handleSaveEdit = async () => {
    if (!selectedTask) return;

    await TaskService.update(selectedTask.id, {
      title: editTitle,
      description: editDescription,
      assignedTo: editAssignedTo,
      projectId: editProjectId,
      dueDate: editDueDate,
      priority: editPriority,
      status: editStatus
    });

    setIsDetailOpen(false);
    setSelectedTask(null);
  };
  
  // DELETE TASK
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    if ('remove' in TaskService) {
      await (TaskService as any).remove(selectedTask.id);
    } else {
      await (TaskService as any).delete?.(selectedTask.id);
    }
    
    setIsDetailOpen(false);
    setSelectedTask(null);
  };

  // ADD ACTION/COMMENT UPDATE (SUPERVISOR ACCESSIBLE PROGRESS LOGGING)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !liveSelectedTask) return;

    const commentPayload = {
      id: String(Date.now()),
      text: newComment.trim(),
      createdBy: `${profile?.name || 'User'} (${profile?.role || 'Crew'})`,
      createdAt: new Date().toISOString()
    };

    const updatedComments = liveSelectedTask.comments 
      ? [...liveSelectedTask.comments, commentPayload]
      : [commentPayload];

    await TaskService.update(liveSelectedTask.id, {
      comments: updatedComments
    });

    setNewComment('');
  };

  // CATEGORY BADGE BUILDERS
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100/50';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50';
      default: return 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100/50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1.5 shadow-none"><CheckCircle2 className="w-3.5 h-3.5"/> Completed</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 gap-1.5 shadow-none"><Clock className="w-3.5 h-3.5"/> In Progress</Badge>;
      case 'ON_HOLD': return <Badge className="bg-amber-50 text-amber-700 border-amber-100 gap-1.5 shadow-none"><AlertCircle className="w-3.5 h-3.5"/> On Hold</Badge>;
      default: return <Badge variant="outline" className="text-slate-400 gap-1.5 border-slate-200"><Clock className="w-3.5 h-3.5"/> To Do</Badge>;
    }
  };

  // FILTER LOGIC
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const associatedProj = projects.find(p => p.id === t.projectId);
      const searchLower = search.toLowerCase();
      
      const matchSearch = t.title.toLowerCase().includes(searchLower) || 
                          (t.description?.toLowerCase() || '').includes(searchLower) ||
                          (associatedProj?.name?.toLowerCase() || '').includes(searchLower) ||
                          (t.assignedTo?.toLowerCase() || '').includes(searchLower);
                          
      if (!matchSearch) return false;
      
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;

      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED';

      if (activeTab === 'todo') return t.status === 'TODO';
      if (activeTab === 'in-progress') return t.status === 'IN_PROGRESS' || t.status === 'ON_HOLD';
      if (activeTab === 'completed') return t.status === 'COMPLETED';
      if (activeTab === 'high-priority') return t.priority === 'HIGH' || t.priority === 'URGENT';
      if (activeTab === 'overdue') return !!isOverdue;
      if (activeTab === 'my-tasks') {
        const userName = profile?.name || profile?.email || '';
        return !!t.assignedTo && userName && t.assignedTo.toLowerCase().includes(userName.toLowerCase());
      }
      return true;
    });
  }, [tasks, projects, profile, search, activeTab, filterProject]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-4xl font-black font-heading italic tracking-tight text-slate-900">
                Site Tasks
              </h1>
              {!isManagerOrAdmin ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-none font-black text-xs py-1 px-3 rounded-full uppercase tracking-wider">
                  Supervisor Mode: Progress Updates Only
                </Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-primary/20 shadow-none font-black text-xs py-1 px-3 rounded-full uppercase tracking-wider">
                  Manager Mode
                </Badge>
              )}
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl">
            Track daily operations, field milestones, critical roadblocks, and assignments in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl font-bold bg-primary hover:bg-primary/95 shadow-lg shadow-primary/20 h-12 gap-2 px-6"
            >
              <Plus className="w-5 h-5" />
              New Site Task
            </Button>
          )}
        </div>
      </div>

      {/* Main card panel with tasks */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
              <div className="nav-responsive-container no-scrollbar p-1 w-full overflow-x-auto bg-white rounded-xl border border-slate-100 max-w-full">
                <TabsList className="bg-transparent h-auto max-h-none nav-responsive-list w-full p-0 border-none select-none">
                  <TabsTrigger value="all" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">All Tasks</TabsTrigger>
                  <TabsTrigger value="todo" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">To Do</TabsTrigger>
                  <TabsTrigger value="in-progress" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">In Progress</TabsTrigger>
                  <TabsTrigger value="completed" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center gap-1.5">Completed</TabsTrigger>
                  <TabsTrigger value="high-priority" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">High Priority</TabsTrigger>
                  <TabsTrigger value="overdue" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">Overdue</TabsTrigger>
                  <TabsTrigger value="my-tasks" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all">My Tasks</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto shrink-0">
                <div className="w-full sm:w-48 relative">
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-none">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <SelectValue placeholder="All Projects" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search tasks..." 
                    className="pl-11 h-12 rounded-2xl border-slate-200 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <TabsContent value={activeTab} className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const associatedProj = projects.find(p => p.id === task.projectId);
                return (
                  <div 
                    key={task.id} 
                    onClick={() => handleOpenEdit(task)}
                    className="p-6 hover:bg-slate-50/60 transition-all duration-300 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex gap-5 items-start">
                      <div className="pt-1">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isManagerOrAdmin) return;
                            handleToggleStatus(e, task);
                          }}
                          className={`w-6 h-6 rounded-lg border-2 border-slate-200 flex items-center justify-center ${
                            isManagerOrAdmin ? "cursor-pointer hover:border-primary hover:bg-primary/5" : "cursor-not-allowed opacity-40 hover:none"
                          } transition-all`}
                        >
                          {task.status === 'COMPLETED' ? (
                            <CheckSquare className="w-4 h-4 text-primary fill-primary/10" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover:bg-slate-100 transition-colors" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className={`text-base font-bold tracking-tight transition-all ${
                          task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-primary'
                        }`}>
                          {task.title}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                          {associatedProj && (
                            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-md py-0.5 px-2">
                              <Briefcase className="w-3.5 h-3.5 opacity-75" />
                              <span>{associatedProj.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Assignee: {task.assignedTo || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Due: {task.dueDate || 'No date'}</span>
                          </div>
                          <Badge className={`${getPriorityColor(task.priority)} font-black text-[10px] tracking-widest uppercase border rounded-md px-2 h-5 shadow-none`}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-slate-400 text-sm line-clamp-1 italic max-w-xl pr-4">
                            "{task.description}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      {getStatusBadge(task.status)}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl px-4 font-bold border border-transparent hover:border-slate-200 group-hover:bg-white text-xs"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="p-16 text-center space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto shadow-inner border border-slate-100">
                    <CheckSquare className="w-8 h-8 text-slate-300" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-lg font-black font-heading text-slate-900 italic">No Tasks Available</p>
                    <p className="text-sm text-slate-400 font-medium">Create a new task, or adjust filters to view assigned work.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Overview Analytics panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black font-heading italic text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Overdue / Urgent Actions
                </CardTitle>
                <CardDescription>Actions requiring immediate site intervention</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length > 0 ? (
               <div className="divide-y divide-slate-50">
                  {tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleOpenEdit(t)}
                      className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-pointer"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 text-sm">{t.title}</p>
                        <p className="text-xs text-slate-400 font-semibold font-mono">Due on {t.dueDate}</p>
                      </div>
                      <Badge className="bg-red-50 text-red-700 font-bold border-red-100 rounded-full">URGENT</Badge>
                    </div>
                  ))}
               </div>
            ) : (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">All clear of urgent red flags</p>
                    <p className="text-sm text-slate-400 font-medium">All high-priority bottlenecks are monitored.</p>
                  </div>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black font-heading italic text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Site Status Statistics
                </CardTitle>
                <CardDescription>Site efficiency score & milestones tracking</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
             <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Completion rate</span>
                  <span className="text-sm font-black text-slate-900 italic">
                    {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                   <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000"
                      style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100 : 0}%` }}
                   />
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-1">
                   <div className="bg-slate-50 p-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-1">TO DO</p>
                      <p className="text-2xl font-black italic font-heading text-slate-800">{tasks.filter(t => t.status === 'TODO').length}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-1">ACTIVE</p>
                      <p className="text-2xl font-black italic font-heading text-indigo-700">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl text-center">
                      <p className="text-[10px] font-black tracking-wider uppercase text-slate-400 mb-1">DONE</p>
                      <p className="text-2xl font-black italic font-heading text-emerald-700">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE TASK DIALOG (Controlled Modal) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-[550px] p-8 rounded-[2rem] gap-6 border-none shadow-2xl font-sans">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black font-heading italic text-slate-900">Create New Site Task</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium font-sans">
              Enter details below to broadcast a task to supervisors, safety officers or quality engineers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-slate-700 text-sm">Task Name / Title <span className="text-red-500">*</span></Label>
              <Input 
                id="title" 
                placeholder="e.g. Pre-slip pipeline concrete layout audit" 
                className="h-12 rounded-xl border-slate-100 bg-slate-50/50"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project" className="font-bold text-slate-700 text-sm">Associated Project <span className="text-red-500">*</span></Label>
                <Select value={newProjectId} onValueChange={setNewProjectId} required>
                  <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee" className="font-bold text-slate-700 text-sm">Assigned To</Label>
                <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.name}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="font-bold text-slate-700 text-sm">Task Priority</Label>
                <Select value={newPriority} onValueChange={(val: any) => setNewPriority(val)}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50">
                    <SelectValue placeholder="Priority flag" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent Red Flag</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="font-bold text-slate-700 text-sm">Completion Deadline</Label>
                <Input 
                  id="dueDate"
                  type="date" 
                  className="h-12 rounded-xl border-slate-100 bg-slate-50/50"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-bold text-slate-700 text-sm">Special Instructions & Description</Label>
              <Textarea 
                id="description"
                placeholder="Add secondary architectural annotations, QC checklists, safety guidelines..." 
                className="resize-none h-24 rounded-xl border-slate-100 bg-slate-50/50"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 md:gap-0 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl h-11 px-6 font-bold">
                Discard
              </Button>
              <Button type="submit" className="rounded-xl h-11 px-6 font-bold bg-primary hover:bg-primary/90">
                Log New Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT / VIEW DETAIL TASK DIALOG (Controlled Modal) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto p-8 rounded-[2rem] gap-6 border-none shadow-2xl font-sans">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black font-heading italic text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Task Details & Progress Updates
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium font-sans">
              {!isManagerOrAdmin 
                ? "View full details or update the work progress timeline by adding comments."
                : "Modify the live status, priority markings, completion deadline, or description associated with this task."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="font-bold text-slate-700 text-sm">Task Name / Title</Label>
              <Input 
                id="edit-title"
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600 font-bold"
                value={editTitle}
                disabled={!isManagerOrAdmin}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="font-bold text-slate-700 text-sm">Current Status</Label>
                <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)} disabled={!isManagerOrAdmin}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority" className="font-bold text-slate-700 text-sm">Priority level</Label>
                <Select value={editPriority} onValueChange={(val: any) => setEditPriority(val)} disabled={!isManagerOrAdmin}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent Red Flag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-project" className="font-bold text-slate-700 text-sm">Project Location</Label>
                <Select value={editProjectId} onValueChange={setEditProjectId} disabled={!isManagerOrAdmin}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-assignee" className="font-bold text-slate-700 text-sm">Assigned To</Label>
                <Select value={editAssignedTo} onValueChange={setEditAssignedTo} disabled={!isManagerOrAdmin}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {users.map(u => (
                      <SelectItem key={u.email} value={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-dueDate" className="font-bold text-slate-700 text-sm">Completion Deadline</Label>
                {!canChangeDueDate && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                    Read-only (Project Managers only)
                  </span>
                )}
              </div>
              <Input 
                id="edit-dueDate"
                type="date" 
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-500"
                value={editDueDate}
                disabled={!canChangeDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="font-bold text-slate-700 text-sm">Instructions</Label>
              <Textarea 
                id="edit-description"
                className="resize-none h-20 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-85 disabled:text-slate-600 italic"
                value={editDescription}
                disabled={!isManagerOrAdmin}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            {/* PROGRESS UPDATE BY COMMENTING SECTION */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="font-black text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Bookmark className="w-4 h-4 text-primary" />
                Work Progress & On-Site Updates ({liveSelectedTask?.comments?.length || 0})
              </h3>
              
              {/* Comment Thread */}
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {liveSelectedTask?.comments && liveSelectedTask.comments.length > 0 ? (
                  liveSelectedTask.comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono">
                        <span>{comment.createdBy}</span>
                        <span>{safeFormatDate(comment.createdAt, 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                      <p className="text-slate-700 font-medium text-xs whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-5 bg-slate-50/40 rounded-xl border border-dashed border-slate-200">
                    No progress comments logged yet. Supervisors can post updates below.
                  </p>
                )}
              </div>

              {/* Add Comment Input */}
              <div className="space-y-2 pt-1">
                <Textarea 
                  placeholder="Type an update on the current work progress, technical logs, or raw material clearances..."
                  className="resize-none h-16 text-xs rounded-xl border-slate-100 bg-white shadow-sm"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="w-full rounded-xl text-xs font-bold gap-2 h-10 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Post Work Progress Update
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 md:gap-0 pt-4 border-t border-slate-50">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl h-11 px-6 font-bold">
              Dismiss
            </Button>
            {isManagerOrAdmin && (
              <Button onClick={handleSaveEdit} className="rounded-xl h-11 px-6 font-bold bg-primary hover:bg-primary/95 shadow-md shadow-primary/10">
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
