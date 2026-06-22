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
    console.log('reports in listPage:', reports);
    const unsubReports = ProgressService.subscribe(setReports);
    const unsubProjects = ProjectService.subscribe(setProjects);
    return () => {
      unsubReports();
      unsubProjects();
    }
  }, []);

  const getProjectName = useMemo(() => (idOrName: string) => {
    const project = projects.find(p => p.id === idOrName || p.name === idOrName);
    return project ? project.name : 'Unknown Project';
  }, [projects]);

  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Supervisor permission: only their reports
    if (profile?.role === UserRole.QUALITY_ENGINEER || (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.PROJECT_MANAGER)) {
       filtered = filtered.filter(r => r.supervisorId === profile?.uid);
    }

    if (selectedProject !== 'ALL') {
      filtered = filtered.filter(r => r.projectId === selectedProject || r.projectName === selectedProject);
    } else if (projectIdParam) {
      filtered = filtered.filter(r => r.projectId === projectIdParam || r.projectName === projectIdParam);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const pName = getProjectName(r.projectId) || r.projectName || 'General';
        return r.id.toLowerCase().includes(s) || 
          r.supervisorName?.toLowerCase().includes(s) ||
          pName.toLowerCase().includes(s);
      });
    }

    const sortedReports = filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sortedReports;
  }, [reports, selectedProject, statusFilter, searchTerm, profile, projectIdParam, getProjectName]);

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
        <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Total Reports</p>
                <h3 className="text-3xl font-black text-slate-950 leading-none">{stats.total}</h3>
              </div>
              <div className="p-3 bg-white/90 border border-white/60 rounded-2xl shadow-xs text-blue-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Submitted Today</p>
                <h3 className="text-3xl font-black text-slate-950 leading-none">{stats.today}</h3>
              </div>
              <div className="p-3 bg-white/90 border border-white/60 rounded-2xl shadow-xs text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Pending Review</p>
                <h3 className="text-3xl font-black text-slate-950 leading-none">{stats.pending}</h3>
              </div>
              <div className="p-3 bg-white/90 border border-white/60 rounded-2xl shadow-xs text-orange-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1">Approved Reports</p>
                <h3 className="text-3xl font-black text-slate-950 leading-none">{stats.approved}</h3>
              </div>
              <div className="p-3 bg-white/90 border border-white/60 rounded-2xl shadow-xs text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
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
                  <SelectValue placeholder="All Projects">
                    {selectedProject === 'ALL' ? 'All Projects' : (getProjectName(selectedProject))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.location ? `(${p.location})` : ''}</SelectItem>
                  ))}
                  {selectedProject !== 'ALL' && !projects.find(p => p.id === selectedProject) && (
                    <SelectItem value={selectedProject}>Unknown Project</SelectItem>
                  )}
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

      {/* Reports Table - Desktop View, Cards on Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredReports.length === 0 ? (
          <Card className="border-none bg-white/60 p-8 text-center text-slate-400 italic rounded-2xl">
            No reports found for the selected criteria.
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card 
              key={report.id} 
              className="border-none shadow-md shadow-slate-100 bg-white/65 backdrop-blur-md p-5 rounded-[2rem] flex flex-col gap-4 group relative overflow-hidden cursor-pointer hover:bg-white transition-colors"
              onClick={() => navigate(`/daily-reports/${report.id}`)}
              id={`report-card-${report.id}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-black text-slate-450 uppercase tracking-wider">
                  #{report.id.slice(-8).toUpperCase()}
                </span>
                {getStatusBadge(report.status)}
              </div>
              
              <div>
                <p className="font-extrabold text-slate-900 text-[15px] tracking-tight">{getProjectName(report.projectId) || report.projectName || 'Unknown Project'}</p>
                <p className="text-xs text-slate-500 italic mt-0.5">Site: {report.siteInchargeName || 'Main'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs text-left">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Supervisor</span>
                  <span className="font-bold text-slate-700">{report.supervisorName || 'System'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Date</span>
                  <span className="font-extrabold text-slate-900">{format(new Date(report.date), 'dd MMM yyyy')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  Submitted: {format(new Date(report.createdAt), 'hh:mm a')}
                </span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 shadow-xs" onClick={() => navigate(`/daily-reports/${report.id}`)} title="View Report">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-100 bg-white text-slate-600 hover:bg-slate-50 shadow-xs" onClick={() => navigate(`/daily-reports/${report.id}?download=true`)} title="Download PDF">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-100 bg-white text-slate-600 hover:bg-slate-50 shadow-xs" onClick={() => navigate(`/daily-reports/${report.id}?print=true`)} title="Print">
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden md:block border-none shadow-xl shadow-teal-950/2 bg-white/60 backdrop-blur-md rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto w-full">
        <Table compact>
          <TableHeader className="bg-slate-50">
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic border-b border-slate-200">
              <TableHead className="w-[120px] pl-6">Report ID</TableHead>
              <TableHead>Project / Site</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
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
                <TableRow key={report.id} className="hover:bg-slate-50/50 group transition-colors border-b border-slate-100">
                  <TableCell className="font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600 pl-6">
                    #{report.id.slice(-8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-bold text-slate-900">{getProjectName(report.projectId) || report.projectName || 'Unknown Project'}</div>
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
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
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
