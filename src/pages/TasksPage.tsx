import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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

const MOCK_TASKS = [
  { id: '1', title: 'Brickwork for 3rd Floor', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-05-15', assignedTo: 'Amit Singh', createdAt: '2024-05-10' },
  { id: '2', title: 'Electrical Wiring Inspection', status: 'TODO', priority: 'MEDIUM', dueDate: '2024-05-18', assignedTo: 'Sunil Verma', createdAt: '2024-05-11' },
  { id: '3', title: 'Tile Delivery Coordination', status: 'COMPLETED', priority: 'URGENT', dueDate: '2024-05-12', assignedTo: 'Rajesh Kumar', createdAt: '2024-05-09' },
  { id: '4', title: 'Painting Foundation Walls', status: 'TODO', priority: 'LOW', dueDate: '2024-05-25', assignedTo: 'Vikram Rathore', createdAt: '2024-05-12' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [search, setSearch] = useState('');

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5"><CheckCircle2 className="w-3 h-3"/> Done</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1.5"><Clock className="w-3 h-3"/> Busy</Badge>;
      default: return <Badge variant="outline" className="text-slate-400 gap-1.5"><Clock className="w-3 h-3"/> To Do</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Site Tasks & Issues</h1>
          <p className="text-slate-500 text-sm">Actionable items and quality reporting for site supervision.</p>
        </div>
        <Dialog>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Site Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input placeholder="What needs to be done?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Add details or context..." className="resize-none h-24" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Discard</Button>
              <Button className="bg-blue-600">Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <Tabs defaultValue="all" className="w-full">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="todo">To Do</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search tasks..." 
                className="pl-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="all" className="m-0">
            <div className="divide-y divide-slate-100">
              {tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())).map((task) => (
                <div key={task.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex gap-4 items-start">
                    <div className="pt-1">
                      <div className="w-5 h-5 rounded border-2 border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                        {task.status === 'COMPLETED' && <CheckSquare className="w-3 h-3 text-blue-500 fill-blue-500" />}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className={`font-medium ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{task.assignedTo}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>Due: {task.dueDate}</span>
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} font-bold text-[10px] tracking-tight uppercase px-1.5 h-4 border`}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(task.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Critical Red Flags
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600">View All</Button>
          </div>
          <CardContent className="p-0">
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">No red flags found for this project</p>
                <p className="text-sm text-slate-500">All high-priority issues are resolved.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-slate-900">
                <Clock className="w-4 h-4 text-blue-500" />
                Next 48 Hours
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600">View Calendar</Button>
          </div>
          <CardContent className="p-4">
             <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-slate-600 font-medium italic">Planned Work Delivery</span>
                   <span className="text-xs font-mono text-slate-400">14 May</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-slate-600 font-medium italic">Slab Casting Phase 2</span>
                   <span className="text-xs font-mono text-slate-400">15 May</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
