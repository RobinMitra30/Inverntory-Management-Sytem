import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Calendar as CalendarIcon, 
  Plus, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { Attendance, Project } from '@/types';
import { toast } from 'sonner';

const MOCK_WORKERS = [
  "Rajesh Kumar", "Amit Singh", "Sunil Verma", "Suresh Yadav", "Mohan Das",
  "Pritam Sharma", "Vikram Rathore", "Sanjay Gupta", "Rahul Mishra", "Deepak Saini"
];

export default function AttendancePage() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const totalPresent = attendance.filter(a => a.status === 'PRESENT').length;
  const totalAbsent = attendance.filter(a => a.status === 'ABSENT').length;
  const totalHalfDay = attendance.filter(a => a.status === 'HALF_DAY').length;

  const handleMarkAttendance = (workerName: string, status: Attendance['status']) => {
    const newEntry: Attendance = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: selectedProject === 'all' ? 'DEFAULT' : selectedProject,
      date: selectedDate,
      workerName,
      workerType: 'LABOR',
      status,
      shift: 'DAY',
      markedBy: profile?.uid || 'SYSTEM'
    };

    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.workerName === workerName && a.date === selectedDate));
      return [...filtered, newEntry];
    });
    toast.success(`Marked ${workerName} as ${status}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Labor Attendance</h1>
          <p className="text-slate-500 text-sm">Track daily presence of workforce across different sites.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            {selectedDate}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Strength</span>
              <span className="text-3xl font-bold text-blue-900">{MOCK_WORKERS.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Present</span>
              <span className="text-3xl font-bold text-green-900">{totalPresent}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Half Day</span>
              <span className="text-3xl font-bold text-orange-900">{totalHalfDay}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Absent</span>
              <span className="text-3xl font-bold text-red-900">{totalAbsent}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search worker by name..." 
              className="pl-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full md:w-48 bg-white">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="site-a">Skyline Residency</SelectItem>
                <SelectItem value="site-b">Metro Hub</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="bg-white">
              <Filter className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[300px]">Worker Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_WORKERS.filter(w => w.toLowerCase().includes(search.toLowerCase())).map((worker) => {
              const entry = attendance.find(a => a.workerName === worker && a.date === selectedDate);
              return (
                <TableRow key={worker} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {worker.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{worker}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-slate-500">LABOR</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Day Shift</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {!entry ? (
                         <Badge variant="secondary" className="bg-slate-100 text-slate-400">PENDING</Badge>
                      ) : entry.status === 'PRESENT' ? (
                         <Badge className="bg-green-100 text-green-700 border-green-200">PRESENT</Badge>
                      ) : entry.status === 'HALF_DAY' ? (
                         <Badge className="bg-orange-100 text-orange-700 border-orange-200">HALF DAY</Badge>
                      ) : (
                         <Badge className="bg-red-100 text-red-700 border-red-200">ABSENT</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button 
                         size="sm" 
                         variant={entry?.status === 'PRESENT' ? 'default' : 'outline'}
                         className={entry?.status === 'PRESENT' ? 'bg-green-600' : 'h-8 px-2'}
                         onClick={() => handleMarkAttendance(worker, 'PRESENT')}
                       >
                         <CheckCircle2 className="w-4 h-4" />
                       </Button>
                       <Button 
                         size="sm" 
                         variant={entry?.status === 'ABSENT' ? 'default' : 'outline'}
                         className={entry?.status === 'ABSENT' ? 'bg-red-600' : 'h-8 px-2'}
                         onClick={() => handleMarkAttendance(worker, 'ABSENT')}
                       >
                         <XCircle className="w-4 h-4" />
                       </Button>
                       <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                         <MoreHorizontal className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
