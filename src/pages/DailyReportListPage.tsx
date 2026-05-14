import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DailyReport, Project, UserProfile, UserRole } from '@/types';
import { ProgressService, ProjectService } from '@/services/store';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';

export default function DailyReportListPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>(projectIdParam || 'ALL');

  useEffect(() => {
    const unsubReports = ProgressService.subscribe(setReports);
    const unsubProjects = ProjectService.subscribe(setProjects);
    return () => {
      unsubReports();
      unsubProjects();
    }
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Supervisor permission: only their reports
    if (profile?.role === UserRole.QUALITY_ENGINEER || (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PROJECT_MANAGER)) {
       // Assuming non-admins/managers only see their reports if they are supervisors
       // But user said "Supervisors: Can view only their submitted reports"
       filtered = filtered.filter(r => r.supervisorId === profile?.uid);
    }

    if (selectedProject !== 'ALL') {
      filtered = filtered.filter(r => r.projectId === selectedProject);
    } else if (projectIdParam) {
      filtered = filtered.filter(r => r.projectId === projectIdParam);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(s) || 
        r.supervisorName?.toLowerCase().includes(s) ||
        r.projectName?.toLowerCase().includes(s)
      );
    }

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reports, selectedProject, statusFilter, searchTerm, profile, projectIdParam]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: filteredReports.length,
      today: filteredReports.filter(r => r.date === today).length,
      pending: filteredReports.filter(r => r.status === 'SUBMITTED').length,
      approved: filteredReports.filter(r => r.status === 'APPROVED').length,
    };
  }, [filteredReports]);

  const getStatusBadge = (status: DailyReport['status']) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="outline" className="bg-slate-100 text-slate-600">Draft</Badge>;
      case 'SUBMITTED': return <Badge variant="outline" className="bg-blue-100 text-blue-600">Submitted</Badge>;
      case 'REVIEWED': return <Badge variant="outline" className="bg-purple-100 text-purple-600">Reviewed</Badge>;
      case 'APPROVED': return <Badge variant="outline" className="bg-green-100 text-green-600">Approved</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Daily Site Reports</h1>
          <p className="text-slate-500 text-sm">Comprehensive archive of all submitted site progress logs.</p>
        </div>
        {!projectIdParam && profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PROJECT_MANAGER ? null : (
           <Button className="bg-blue-600 hover:bg-blue-700 font-bold italic" onClick={() => navigate(projectIdParam ? `/projects/${projectIdParam}/daily-report` : '/projects')}>
             <Plus className="w-4 h-4 mr-2" />
             New Report
           </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none bg-slate-900 text-white shadow-xl overflow-hidden relative group">
          <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Total Reports</p>
                <h3 className="text-4xl font-bold italic tracking-tighter">{stats.total}</h3>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl overflow-hidden relative group border-t-4 border-t-blue-600">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Submitted Today</p>
                <h3 className="text-4xl font-bold italic tracking-tighter text-slate-900">{stats.today}</h3>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl overflow-hidden relative group border-t-4 border-t-orange-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Pending Review</p>
                <h3 className="text-4xl font-bold italic tracking-tighter text-slate-900">{stats.pending}</h3>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl overflow-hidden relative group border-t-4 border-t-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Approved Reports</p>
                <h3 className="text-4xl font-bold italic tracking-tighter text-slate-900">{stats.approved}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by ID, Supervisor or Project..." 
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {!projectIdParam && (
               <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic">
              <TableHead className="w-[120px]">Report ID</TableHead>
              <TableHead>Project / Site</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-sm">
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-slate-400 italic">
                   No reports found for the selected criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id} className="hover:bg-slate-50 group transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600">
                    #{report.id.slice(-8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-bold text-slate-900">{report.projectName || 'General'}</div>
                      <div className="text-xs text-slate-500 italic uppercase tracking-tighter">Site: {report.siteInchargeName || 'Main'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-600">
                    {report.supervisorName || 'System'}
                  </TableCell>
                  <TableCell className="font-bold text-slate-700">
                    {format(new Date(report.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400 italic">
                    {format(new Date(report.createdAt), 'hh:mm a')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(report.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-blue-50 hover:text-blue-600" onClick={() => navigate(`/daily-reports/${report.id}`)} title="View Report">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-50 hover:text-slate-600" onClick={() => navigate(`/daily-reports/${report.id}?download=true`)} title="Download PDF">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-50 hover:text-slate-600" onClick={() => navigate(`/daily-reports/${report.id}?print=true`)} title="Print">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
